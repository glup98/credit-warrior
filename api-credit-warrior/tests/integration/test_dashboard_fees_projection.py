from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app


def test_multi_month_projection_card_extinguishes_debt_and_fee_drops_to_zero(
    client: TestClient,
) -> None:
    # Card with default_monthly_fee = 4500 CLP
    card_resp = client.post(
        "/api/v1/cards",
        json={
            "name": "Santander Extinction Test",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "4500",
        },
    )
    assert card_resp.status_code == 201
    card = card_resp.json()

    person_resp = client.post("/api/v1/persons", json={"name": "Juan Extinction"})
    assert person_resp.status_code == 201
    person = person_resp.json()

    # Purchase: 60,000 CLP in 2 installments (billed in 2026-11 and 2026-12)
    exp_resp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card["id"],
            "description": "Herramientas 2 cuotas",
            "total_amount": "60000",
            "purchase_date": "2026-10-15",
            "installments_count": 2,
            "splits": [
                {"person_id": person["id"], "split_type": "EQUAL"},
            ],
        },
    )
    assert exp_resp.status_code == 201

    # Override for Month 2 (2026-12): 6000 CLP (active debt, should be respected)
    override_m2 = client.put(
        f"/api/v1/cards/{card['id']}/fees/2026-12",
        json={"fee": "6000"},
    )
    assert override_m2.status_code == 200

    # Override for Month 3 (2027-01): 9999 CLP (debt extinguished, MUST NOT be charged!)
    override_m3 = client.put(
        f"/api/v1/cards/{card['id']}/fees/2027-01",
        json={"fee": "9999"},
    )
    assert override_m3.status_code == 200

    # Query 6-month projection starting at 2026-11 (RF-10)
    proj_resp = client.get("/api/v1/dashboard/projection?start_period=2026-11&months=6")
    assert proj_resp.status_code == 200
    proj = proj_resp.json()

    assert proj["start_period"] == "2026-11"
    assert proj["months"] == 6
    periods = proj["periods"]
    assert len(periods) == 6

    # Period 1: 2026-11 (Installment 1/2 active, default fee 4500 applies)
    p1 = periods[0]
    assert p1["period"] == "2026-11"
    assert len(p1["by_card"]) == 1
    c1 = p1["by_card"][0]
    assert c1["card_id"] == card["id"]
    assert Decimal(c1["purchases_total"]) == Decimal("30000")
    assert Decimal(c1["maintenance_fee"]) == Decimal("4500")
    assert Decimal(c1["total_due"]) == Decimal("34500")
    assert Decimal(p1["totals_by_currency"]["CLP"]) == Decimal("34500")
    assert len(c1["by_person"]) == 1
    assert Decimal(c1["by_person"][0]["purchases_amount"]) == Decimal("30000")
    assert Decimal(c1["by_person"][0]["fee_share"]) == Decimal("4500")
    assert Decimal(c1["by_person"][0]["amount_due"]) == Decimal("34500")

    # Period 2: 2026-12 (Installment 2/2 active, override fee 6000 applies)
    p2 = periods[1]
    assert p2["period"] == "2026-12"
    assert len(p2["by_card"]) == 1
    c2 = p2["by_card"][0]
    assert c2["card_id"] == card["id"]
    assert Decimal(c2["purchases_total"]) == Decimal("30000")
    assert Decimal(c2["maintenance_fee"]) == Decimal("6000")
    assert Decimal(c2["total_due"]) == Decimal("36000")
    assert Decimal(p2["totals_by_currency"]["CLP"]) == Decimal("36000")
    assert len(c2["by_person"]) == 1
    assert Decimal(c2["by_person"][0]["purchases_amount"]) == Decimal("30000")
    assert Decimal(c2["by_person"][0]["fee_share"]) == Decimal("6000")
    assert Decimal(c2["by_person"][0]["amount_due"]) == Decimal("36000")

    # Periods 3 to 6: 2027-01 to 2027-04 (Debt fully extinguished)
    # The card has NO active installments, so fee strictly drops to $0 and card
    # does not figure in by_card nor sum to totals_by_currency.
    for p_idx in range(2, 6):
        p = periods[p_idx]
        assert len(p["by_card"]) == 0
        assert Decimal(p["totals_by_currency"]["CLP"]) == Decimal("0")
        assert Decimal(p["totals_by_currency"]["USD"]) == Decimal("0.00")
        assert len(p["by_person"]) == 0
        assert len(p["active_installments"]) == 0

    # Strict Quadrature Invariant across all 6 periods
    for p in periods:
        clp_total = Decimal(p["totals_by_currency"]["CLP"])
        card_clp_sum = sum(
            Decimal(c["total_due"]) for c in p["by_card"] if c["currency"] == "CLP"
        )
        person_clp_sum = sum(
            Decimal(person["totals_by_currency"]["CLP"]) for person in p["by_person"]
        )
        assert clp_total == card_clp_sum == person_clp_sum


def test_multi_month_projection_multi_card_multi_currency_with_partial_extinction(
    client: TestClient,
) -> None:
    # 1. CLP Card with default fee = 5000 CLP
    card_clp = client.post(
        "/api/v1/cards",
        json={
            "name": "BCI CLP Multi",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "5000",
        },
    ).json()

    # 2. USD Card with default fee = 8.00 USD
    card_usd = client.post(
        "/api/v1/cards",
        json={
            "name": "Amex USD Multi",
            "currency": "USD",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "8.00",
        },
    ).json()

    alice = client.post("/api/v1/persons", json={"name": "Alice Multi"}).json()
    bob = client.post("/api/v1/persons", json={"name": "Bob Multi"}).json()

    # CLP Expense: 90,000 CLP in 3 installments (30,000 each in 2026-11, 2026-12, 2027-01)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_clp["id"],
            "description": "Notebook",
            "total_amount": "90000",
            "purchase_date": "2026-10-15",
            "installments_count": 3,
            "splits": [
                {"person_id": alice["id"], "split_type": "EQUAL"},
                {"person_id": bob["id"], "split_type": "EQUAL"},
            ],
        },
    )

    # USD Expense: 40.00 USD in 1 installment (billed in 2026-11)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_usd["id"],
            "description": "Cloud hosting",
            "total_amount": "40.00",
            "purchase_date": "2026-10-15",
            "installments_count": 1,
            "splits": [
                {"person_id": alice["id"], "split_type": "PERCENTAGE", "percentage": "75.00"},
                {"person_id": bob["id"], "split_type": "PERCENTAGE", "percentage": "25.00"},
            ],
        },
    )

    # Overrides:
    # CLP Month 2 (2026-12): override 6500 CLP
    client.put(f"/api/v1/cards/{card_clp['id']}/fees/2026-12", json={"fee": "6500"})

    # USD Month 1 (2026-11): override 12.00 USD
    client.put(f"/api/v1/cards/{card_usd['id']}/fees/2026-11", json={"fee": "12.00"})

    # USD Month 2 (2026-12): override 15.00 USD (debt already extinguished!)
    client.put(f"/api/v1/cards/{card_usd['id']}/fees/2026-12", json={"fee": "15.00"})

    # 4-month projection starting at 2026-11
    proj = client.get("/api/v1/dashboard/projection?start_period=2026-11&months=4").json()
    periods = proj["periods"]
    assert len(periods) == 4

    # Period 1 (2026-11): Both cards active
    # CLP: 30000 purchases + 5000 fee (default) = 35000
    # USD: 40.00 purchases + 12.00 fee (override) = 52.00
    p1 = periods[0]
    assert p1["period"] == "2026-11"
    assert Decimal(p1["totals_by_currency"]["CLP"]) == Decimal("35000")
    assert Decimal(p1["totals_by_currency"]["USD"]) == Decimal("52.00")
    by_card_p1 = {c["card_id"]: c for c in p1["by_card"]}
    assert len(by_card_p1) == 2

    c_clp_p1 = by_card_p1[card_clp["id"]]
    assert Decimal(c_clp_p1["purchases_total"]) == Decimal("30000")
    assert Decimal(c_clp_p1["maintenance_fee"]) == Decimal("5000")
    assert Decimal(c_clp_p1["total_due"]) == Decimal("35000")

    c_usd_p1 = by_card_p1[card_usd["id"]]
    assert Decimal(c_usd_p1["purchases_total"]) == Decimal("40.00")
    assert Decimal(c_usd_p1["maintenance_fee"]) == Decimal("12.00")
    assert Decimal(c_usd_p1["total_due"]) == Decimal("52.00")

    # Period 2 (2026-12): CLP active (installment 2/3), USD extinguished!
    # CLP: 30000 purchases + 6500 fee (override) = 36500
    # USD: extinguished, fee = 0, not in by_card
    p2 = periods[1]
    assert p2["period"] == "2026-12"
    assert Decimal(p2["totals_by_currency"]["CLP"]) == Decimal("36500")
    assert Decimal(p2["totals_by_currency"]["USD"]) == Decimal("0.00")
    by_card_p2 = {c["card_id"]: c for c in p2["by_card"]}
    assert len(by_card_p2) == 1
    assert card_usd["id"] not in by_card_p2

    c_clp_p2 = by_card_p2[card_clp["id"]]
    assert Decimal(c_clp_p2["purchases_total"]) == Decimal("30000")
    assert Decimal(c_clp_p2["maintenance_fee"]) == Decimal("6500")
    assert Decimal(c_clp_p2["total_due"]) == Decimal("36500")

    # Period 3 (2027-01): CLP active (installment 3/3, default fee), USD extinguished
    # CLP: 30000 purchases + 5000 fee (default) = 35000
    # USD: extinguished, 0.00
    p3 = periods[2]
    assert p3["period"] == "2027-01"
    assert Decimal(p3["totals_by_currency"]["CLP"]) == Decimal("35000")
    assert Decimal(p3["totals_by_currency"]["USD"]) == Decimal("0.00")
    by_card_p3 = {c["card_id"]: c for c in p3["by_card"]}
    assert len(by_card_p3) == 1
    assert card_usd["id"] not in by_card_p3

    c_clp_p3 = by_card_p3[card_clp["id"]]
    assert Decimal(c_clp_p3["purchases_total"]) == Decimal("30000")
    assert Decimal(c_clp_p3["maintenance_fee"]) == Decimal("5000")
    assert Decimal(c_clp_p3["total_due"]) == Decimal("35000")

    # Period 4 (2027-02): Both cards extinguished!
    p4 = periods[3]
    assert p4["period"] == "2027-02"
    assert Decimal(p4["totals_by_currency"]["CLP"]) == Decimal("0")
    assert Decimal(p4["totals_by_currency"]["USD"]) == Decimal("0.00")
    assert len(p4["by_card"]) == 0
    assert len(p4["by_person"]) == 0
    assert len(p4["active_installments"]) == 0

    # Invariants on each period
    for p in periods:
        for curr in ["CLP", "USD"]:
            expected_total = Decimal(p["totals_by_currency"][curr])
            card_sum = sum(
                Decimal(c["total_due"]) for c in p["by_card"] if c["currency"] == curr
            )
            person_sum = sum(
                Decimal(per["totals_by_currency"][curr]) for per in p["by_person"]
            )
            assert expected_total == card_sum == person_sum


def test_multi_month_projection_deferred_expense_applies_fee_only_when_billed(
    client: TestClient,
) -> None:
    # Card with default_monthly_fee = 3500 CLP
    card = client.post(
        "/api/v1/cards",
        json={
            "name": "Deferred Fee Test Card",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "3500",
        },
    ).json()

    person = client.post("/api/v1/persons", json={"name": "Deferred Person"}).json()

    # Expense purchased in 2026-10, but first_billing_override = 2027-01
    # (Month 3 of 2026-11 projection)
    # 2 installments: billed in 2027-01 and 2027-02
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card["id"],
            "description": "Viaje diferido",
            "total_amount": "80000",
            "purchase_date": "2026-10-15",
            "installments_count": 2,
            "first_billing_override": "2027-01",
            "splits": [
                {"person_id": person["id"], "split_type": "EQUAL"},
            ],
        },
    )

    proj = client.get("/api/v1/dashboard/projection?start_period=2026-11&months=4").json()
    periods = proj["periods"]
    assert len(periods) == 4

    # Period 1 (2026-11): Deferred purchase not billed yet. Fee is strictly 0.
    assert len(periods[0]["by_card"]) == 0
    assert Decimal(periods[0]["totals_by_currency"]["CLP"]) == Decimal("0")

    # Period 2 (2026-12): Deferred purchase not billed yet. Fee is strictly 0.
    assert len(periods[1]["by_card"]) == 0
    assert Decimal(periods[1]["totals_by_currency"]["CLP"]) == Decimal("0")

    # Period 3 (2027-01): Installment 1/2 starts! Card is active and fee applies.
    assert len(periods[2]["by_card"]) == 1
    c_m3 = periods[2]["by_card"][0]
    assert Decimal(c_m3["purchases_total"]) == Decimal("40000")
    assert Decimal(c_m3["maintenance_fee"]) == Decimal("3500")
    assert Decimal(c_m3["total_due"]) == Decimal("43500")
    assert Decimal(periods[2]["totals_by_currency"]["CLP"]) == Decimal("43500")

    # Period 4 (2027-02): Installment 2/2. Fee applies.
    assert len(periods[3]["by_card"]) == 1
    c_m4 = periods[3]["by_card"][0]
    assert Decimal(c_m4["purchases_total"]) == Decimal("40000")
    assert Decimal(c_m4["maintenance_fee"]) == Decimal("3500")
    assert Decimal(c_m4["total_due"]) == Decimal("43500")
    assert Decimal(periods[3]["totals_by_currency"]["CLP"]) == Decimal("43500")

    # Invariants
    for p in periods:
        clp_total = Decimal(p["totals_by_currency"]["CLP"])
        card_clp_sum = sum(
            Decimal(c["total_due"]) for c in p["by_card"] if c["currency"] == "CLP"
        )
        person_clp_sum = sum(
            Decimal(per["totals_by_currency"]["CLP"]) for per in p["by_person"]
        )
        assert clp_total == card_clp_sum == person_clp_sum


def test_multi_month_projection_default_parameters_with_dependency_override(
    client: TestClient,
) -> None:
    from app.api.v1.endpoints.dashboard import get_reference_date

    app.dependency_overrides[get_reference_date] = lambda: date(2026, 10, 16)
    try:
        # Default start_period is computed from reference_date (2026-10-16 -> 2026-11)
        resp = client.get("/api/v1/dashboard/projection")
        assert resp.status_code == 200
        data = resp.json()
        assert data["start_period"] == "2026-11"
        assert data["months"] == 6
        assert len(data["periods"]) == 6
    finally:
        app.dependency_overrides.pop(get_reference_date, None)


def test_multi_month_projection_inactive_card_and_empty_card_with_overrides(
    client: TestClient,
) -> None:
    # 1. Empty Card with default fee = 5000 and override = 8000 in 2026-11 and 2026-12
    empty_card = client.post(
        "/api/v1/cards",
        json={
            "name": "Empty Card with Overrides",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "5000",
        },
    ).json()
    client.put(f"/api/v1/cards/{empty_card['id']}/fees/2026-11", json={"fee": "8000"})
    client.put(f"/api/v1/cards/{empty_card['id']}/fees/2026-12", json={"fee": "8000"})

    # 2. Deactivated Card with default fee = 4000 and 2 active installments
    inactive_card = client.post(
        "/api/v1/cards",
        json={
            "name": "Deactivated Card Projected",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "4000",
        },
    ).json()
    client.patch(f"/api/v1/cards/{inactive_card['id']}", json={"is_active": False})

    person = client.post("/api/v1/persons", json={"name": "Persona Inactive Card"}).json()
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": inactive_card["id"],
            "description": "Gasto en tarjeta archivada",
            "total_amount": "50000",
            "purchase_date": "2026-10-15",
            "installments_count": 2,
            "splits": [
                {"person_id": person["id"], "split_type": "EQUAL"},
            ],
        },
    )

    proj = client.get("/api/v1/dashboard/projection?start_period=2026-11&months=4").json()
    periods = proj["periods"]

    # Month 1 (2026-11):
    # - Empty card has NO purchases -> NOT in by_card, fee = 0
    # - Deactivated card has purchase installment 1/2 (25000) -> in by_card,
    #   fee = 0, total_due = 25000
    p1 = periods[0]
    p1_card_ids = [c["card_id"] for c in p1["by_card"]]
    assert empty_card["id"] not in p1_card_ids
    assert inactive_card["id"] in p1_card_ids
    c_p1 = next(c for c in p1["by_card"] if c["card_id"] == inactive_card["id"])
    assert Decimal(c_p1["purchases_total"]) == Decimal("25000")
    assert Decimal(c_p1["maintenance_fee"]) == Decimal("0")
    assert Decimal(c_p1["total_due"]) == Decimal("25000")
    assert Decimal(p1["totals_by_currency"]["CLP"]) == Decimal("25000")

    # Month 2 (2026-12):
    # - Empty card NOT in by_card
    # - Deactivated card installment 2/2 -> fee = 0
    p2 = periods[1]
    p2_card_ids = [c["card_id"] for c in p2["by_card"]]
    assert empty_card["id"] not in p2_card_ids
    assert inactive_card["id"] in p2_card_ids
    c_p2 = next(c for c in p2["by_card"] if c["card_id"] == inactive_card["id"])
    assert Decimal(c_p2["purchases_total"]) == Decimal("25000")
    assert Decimal(c_p2["maintenance_fee"]) == Decimal("0")
    assert Decimal(c_p2["total_due"]) == Decimal("25000")

    # Months 3 and 4 (2027-01 and 2027-02):
    # Deactivated card debt extinguished -> neither card appears in by_card
    for p_idx in [2, 3]:
        p = periods[p_idx]
        assert len(p["by_card"]) == 0
        assert Decimal(p["totals_by_currency"]["CLP"]) == Decimal("0")

