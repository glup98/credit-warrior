import uuid
from decimal import Decimal

from fastapi.testclient import TestClient


def test_dashboard_card_without_active_purchases_charges_zero_fee(
    client: TestClient,
) -> None:
    # 1. Active card with default_monthly_fee = 5000 but NO expenses
    resp_empty_card = client.post(
        "/api/v1/cards",
        json={
            "name": "Inactive Usage Card",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "5000",
        },
    )
    assert resp_empty_card.status_code == 201

    # 2. Inactive card (is_active=False) with default fee and an active expense
    resp_inactive_card = client.post(
        "/api/v1/cards",
        json={
            "name": "Deactivated Card",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "3000",
        },
    )
    assert resp_inactive_card.status_code == 201
    inactive_card_id = resp_inactive_card.json()["id"]

    # Deactivate the card
    patch_resp = client.patch(f"/api/v1/cards/{inactive_card_id}", json={"is_active": False})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["is_active"] is False

    person = client.post("/api/v1/persons", json={"name": "Alice InactiveTest"}).json()
    # Create expense on deactivated card
    exp_resp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": inactive_card_id,
            "description": "Gasto en tarjeta inactiva",
            "total_amount": "20000",
            "purchase_date": "2026-10-15",
            "installments_count": 1,
            "splits": [
                {"person_id": person["id"], "split_type": "EQUAL"},
            ],
        },
    )
    assert exp_resp.status_code == 201

    summary = client.get("/api/v1/dashboard/summary?period=2026-11").json()

    # The empty card must NOT appear in by_card
    by_card_ids = [c["card_id"] for c in summary["by_card"]]
    assert resp_empty_card.json()["id"] not in by_card_ids
    assert inactive_card_id in by_card_ids

    # Deactivated card has purchases_total = 20000 but maintenance_fee = 0 (RF-06)
    inactive_card_summary = next(c for c in summary["by_card"] if c["card_id"] == inactive_card_id)
    assert Decimal(inactive_card_summary["purchases_total"]) == Decimal("20000")
    assert Decimal(inactive_card_summary["maintenance_fee"]) == Decimal("0")
    assert Decimal(inactive_card_summary["total_due"]) == Decimal("20000")

    # Person breakdown for deactivated card
    person_breakdown = inactive_card_summary["by_person"][0]
    assert Decimal(person_breakdown["purchases_amount"]) == Decimal("20000")
    assert Decimal(person_breakdown["fee_share"]) == Decimal("0")
    assert Decimal(person_breakdown["amount_due"]) == Decimal("20000")

    # Total must only equal the purchase total without maintenance fee
    assert Decimal(summary["totals_by_currency"]["CLP"]) == Decimal("20000")


def test_dashboard_single_person_assumes_full_fee_and_default_fee(
    client: TestClient,
) -> None:
    # Card with default_monthly_fee = 4990 CLP
    card = client.post(
        "/api/v1/cards",
        json={
            "name": "Santander CLP",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "4990",
        },
    ).json()

    person = client.post("/api/v1/persons", json={"name": "Solo Person"}).json()

    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card["id"],
            "description": "Supermercado",
            "total_amount": "30000",
            "purchase_date": "2026-10-15",
            "installments_count": 1,
            "splits": [
                {"person_id": person["id"], "split_type": "EQUAL"},
            ],
        },
    )

    summary = client.get("/api/v1/dashboard/summary?period=2026-11").json()

    # 1 person takes 100% of maintenance fee (RF-07)
    card_sum = next(c for c in summary["by_card"] if c["card_id"] == card["id"])
    assert Decimal(card_sum["purchases_total"]) == Decimal("30000")
    assert Decimal(card_sum["maintenance_fee"]) == Decimal("4990")
    assert Decimal(card_sum["total_due"]) == Decimal("34990")
    assert Decimal(card_sum["total_due"]) == Decimal(card_sum["purchases_total"]) + Decimal(
        card_sum["maintenance_fee"]
    )

    # CardPersonBreakdown check (RF-09)
    p_breakdown = card_sum["by_person"][0]
    assert p_breakdown["person_id"] == person["id"]
    assert Decimal(p_breakdown["purchases_amount"]) == Decimal("30000")
    assert Decimal(p_breakdown["fee_share"]) == Decimal("4990")
    assert Decimal(p_breakdown["amount_due"]) == Decimal("34990")
    assert Decimal(p_breakdown["amount_due"]) == Decimal(p_breakdown["purchases_amount"]) + Decimal(
        p_breakdown["fee_share"]
    )

    # PersonMonthlySummary check (RF-09)
    person_sum = next(p for p in summary["by_person"] if p["person_id"] == person["id"])
    assert Decimal(person_sum["totals_by_currency"]["CLP"]) == Decimal("34990")

    # Global totals
    assert Decimal(summary["totals_by_currency"]["CLP"]) == Decimal("34990")


def test_dashboard_multi_person_proration_with_inactive_person_and_override(
    client: TestClient,
) -> None:
    # Card with default_monthly_fee = 3000 CLP
    card = client.post(
        "/api/v1/cards",
        json={
            "name": "Banco de Chile CLP",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "3000",
        },
    ).json()

    # Create monthly fee override for 2026-11 -> 5000 CLP
    fee_resp = client.put(
        f"/api/v1/cards/{card['id']}/fees/2026-11",
        json={"fee": "5000"},
    )
    assert fee_resp.status_code == 200

    p1 = client.post("/api/v1/persons", json={"name": "Participant One"}).json()
    p2 = client.post("/api/v1/persons", json={"name": "Participant Two"}).json()
    p3 = client.post("/api/v1/persons", json={"name": "Participant Three Inactive"}).json()

    # Deactivate Participant Three (RF-07: still participates in fee proration
    # if having active installments)
    patch_p3 = client.patch(f"/api/v1/persons/{p3['id']}", json={"is_active": False})
    assert patch_p3.status_code == 200
    assert patch_p3.json()["is_active"] is False

    # Expense: 90,000 split equally among 3 participants (30,000 each)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card["id"],
            "description": "Cena grupal",
            "total_amount": "90000",
            "purchase_date": "2026-10-10",
            "installments_count": 1,
            "splits": [
                {"person_id": p1["id"], "split_type": "EQUAL"},
                {"person_id": p2["id"], "split_type": "EQUAL"},
                {"person_id": p3["id"], "split_type": "EQUAL"},
            ],
        },
    )

    # Deterministic UUID sorting for remainder check (RF-08)
    sorted_pids = sorted([uuid.UUID(p1["id"]), uuid.UUID(p2["id"]), uuid.UUID(p3["id"])])
    last_pid = str(sorted_pids[-1])
    first_two_pids = [str(pid) for pid in sorted_pids[:-1]]

    summary = client.get("/api/v1/dashboard/summary?period=2026-11").json()
    card_sum = next(c for c in summary["by_card"] if c["card_id"] == card["id"])

    # 5000 / 3 = 1666 (floor), remainder = 5000 - 3332 = 1668
    assert Decimal(card_sum["purchases_total"]) == Decimal("90000")
    assert Decimal(card_sum["maintenance_fee"]) == Decimal("5000")
    assert Decimal(card_sum["total_due"]) == Decimal("95000")

    breakdown_by_id = {b["person_id"]: b for b in card_sum["by_person"]}

    for pid in first_two_pids:
        b = breakdown_by_id[pid]
        assert Decimal(b["purchases_amount"]) == Decimal("30000")
        assert Decimal(b["fee_share"]) == Decimal("1666")
        assert Decimal(b["amount_due"]) == Decimal("31666")

    b_last = breakdown_by_id[last_pid]
    assert Decimal(b_last["purchases_amount"]) == Decimal("30000")
    assert Decimal(b_last["fee_share"]) == Decimal("1668")
    assert Decimal(b_last["amount_due"]) == Decimal("31668")

    # Invariant: sum of fee shares == maintenance fee
    total_shares = sum(Decimal(b["fee_share"]) for b in card_sum["by_person"])
    assert total_shares == Decimal("5000")

    # Invariant: sum of amount_due == total_due
    total_due_calc = sum(Decimal(b["amount_due"]) for b in card_sum["by_person"])
    assert total_due_calc == Decimal("95000")


def test_dashboard_multi_currency_mixed_scenario_and_strict_quadrature_invariants(
    client: TestClient,
) -> None:
    # 1. CLP Card with default_monthly_fee = 4000
    card_clp = client.post(
        "/api/v1/cards",
        json={
            "name": "BCI CLP",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "4000",
        },
    ).json()

    # 2. USD Card with default_monthly_fee = 10.00
    card_usd = client.post(
        "/api/v1/cards",
        json={
            "name": "Amex USD",
            "currency": "USD",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "10.00",
        },
    ).json()

    person_x = client.post("/api/v1/persons", json={"name": "Person X"}).json()
    person_y = client.post("/api/v1/persons", json={"name": "Person Y"}).json()

    # CLP Expense: 100,000 (X: 60%, Y: 40%)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_clp["id"],
            "description": "Electro",
            "total_amount": "100000",
            "purchase_date": "2026-10-15",
            "installments_count": 1,
            "splits": [
                {"person_id": person_x["id"], "split_type": "PERCENTAGE", "percentage": "60.00"},
                {"person_id": person_y["id"], "split_type": "PERCENTAGE", "percentage": "40.00"},
            ],
        },
    )

    # USD Expense: 50.00 (X: 50%, Y: 50%)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_usd["id"],
            "description": "SaaS Subscription",
            "total_amount": "50.00",
            "purchase_date": "2026-10-15",
            "installments_count": 1,
            "splits": [
                {"person_id": person_x["id"], "split_type": "EQUAL"},
                {"person_id": person_y["id"], "split_type": "EQUAL"},
            ],
        },
    )

    summary = client.get("/api/v1/dashboard/summary?period=2026-11").json()

    # Total CLP: 100,000 purchases + 4000 fee = 104,000
    assert Decimal(summary["totals_by_currency"]["CLP"]) == Decimal("104000")
    # Total USD: 50.00 purchases + 10.00 fee = 60.00
    assert Decimal(summary["totals_by_currency"]["USD"]) == Decimal("60.00")

    # Strict Quadrature Invariant:
    # totals_by_currency == sum(by_card.total_due) == sum(by_person.totals_by_currency)
    for curr, expected_total in [("CLP", Decimal("104000")), ("USD", Decimal("60.00"))]:
        card_sum_curr = sum(
            Decimal(c["total_due"]) for c in summary["by_card"] if c["currency"] == curr
        )
        assert card_sum_curr == expected_total, f"Card quadrature failed for {curr}"

        person_sum_curr = sum(
            Decimal(p["totals_by_currency"][curr]) for p in summary["by_person"]
        )
        assert person_sum_curr == expected_total, f"Person quadrature failed for {curr}"

    # Verify active_installments contains STRICTLY purchases (Expense) and NO fee entries
    for item in summary["active_installments"]:
        assert "expense_id" in item
        assert uuid.UUID(item["expense_id"])
        assert item["installment_label"] == "1/1"

    # Purchases total in active_installments matches sum of purchases_total in cards
    clp_installments_total = sum(
        Decimal(item["installment_amount"])
        for item in summary["active_installments"]
        if item["currency"] == "CLP"
    )
    clp_card_purchases_total = sum(
        Decimal(c["purchases_total"]) for c in summary["by_card"] if c["currency"] == "CLP"
    )
    assert clp_installments_total == Decimal("100000")
    assert clp_card_purchases_total == Decimal("100000")
