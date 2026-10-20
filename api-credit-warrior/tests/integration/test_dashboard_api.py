from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app


def test_dashboard_empty_and_default_next_month_rf01(client: TestClient) -> None:
    from app.api.v1.endpoints.dashboard import get_reference_date

    app.dependency_overrides[get_reference_date] = lambda: date(2026, 10, 16)
    try:
        resp = client.get("/api/v1/dashboard/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["period"] == "2026-11"
        assert Decimal(data["totals_by_currency"]["CLP"]) == Decimal("0")
        assert Decimal(data["totals_by_currency"]["USD"]) == Decimal("0")
        assert data["by_card"] == []
        assert data["by_person"] == []
        assert data["active_installments"] == []
    finally:
        app.dependency_overrides.pop(get_reference_date, None)


def test_dashboard_summary_invariants_and_projection_rf02_rf03_rf04(
    client: TestClient,
) -> None:
    card_clp = client.post(
        "/api/v1/cards",
        json={"name": "Visa CLP", "currency": "CLP", "closing_day": 25, "due_day": 10},
    ).json()
    card_usd = client.post(
        "/api/v1/cards",
        json={"name": "Mastercard USD", "currency": "USD", "closing_day": 25, "due_day": 10},
    ).json()
    anyi = client.post("/api/v1/persons", json={"name": "Anyi"}).json()
    augusto = client.post("/api/v1/persons", json={"name": "Augusto"}).json()

    # 1. CLP expense: $100,000 in 2 installments starting 2026-11 (50/50 split)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_clp["id"],
            "description": "Mueble",
            "total_amount": "100000",
            "purchase_date": "2026-10-15",
            "installments_count": 2,
            "splits": [
                {"person_id": anyi["id"], "split_type": "EQUAL"},
                {"person_id": augusto["id"], "split_type": "EQUAL"},
            ],
        },
    )

    # 2. USD expense: $30.00 in 1 installment starting 2026-11 (70% Anyi, 30% Augusto)
    client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_usd["id"],
            "description": "Streaming Anual",
            "total_amount": "30.00",
            "purchase_date": "2026-10-20",
            "installments_count": 1,
            "splits": [
                {"person_id": anyi["id"], "split_type": "PERCENTAGE", "percentage": "70.00"},
                {"person_id": augusto["id"], "split_type": "PERCENTAGE", "percentage": "30.00"},
            ],
        },
    )

    # Summary for 2026-11 (RF-02)
    summary = client.get("/api/v1/dashboard/summary?period=2026-11").json()
    assert summary["period"] == "2026-11"
    assert Decimal(summary["totals_by_currency"]["CLP"]) == Decimal("50000")
    assert Decimal(summary["totals_by_currency"]["USD"]) == Decimal("30.00")

    # Verify person totals in 2026-11
    person_map = {p["person_name"]: p["totals_by_currency"] for p in summary["by_person"]}
    assert Decimal(person_map["Anyi"]["CLP"]) == Decimal("25000")
    assert Decimal(person_map["Augusto"]["CLP"]) == Decimal("25000")
    assert Decimal(person_map["Anyi"]["USD"]) == Decimal("21.00")
    assert Decimal(person_map["Augusto"]["USD"]) == Decimal("9.00")

    # Multi-month projection (RF-03): 2026-11 (both active), 2026-12 (only CLP 2/2), 2027-01 (none)
    proj = client.get("/api/v1/dashboard/projection?start_period=2026-11&months=3").json()
    assert proj["months"] == 3
    p_nov, p_dec, p_jan = proj["periods"]
    assert Decimal(p_nov["totals_by_currency"]["CLP"]) == Decimal("50000")
    assert Decimal(p_nov["totals_by_currency"]["USD"]) == Decimal("30.00")

    assert Decimal(p_dec["totals_by_currency"]["CLP"]) == Decimal("50000")
    assert Decimal(p_dec["totals_by_currency"]["USD"]) == Decimal("0.00")

    assert Decimal(p_jan["totals_by_currency"]["CLP"]) == Decimal("0")
    assert Decimal(p_jan["totals_by_currency"]["USD"]) == Decimal("0.00")

    # Validation errors (RF-04)
    assert client.get("/api/v1/dashboard/summary?period=2026-99").status_code == 400
    assert client.get("/api/v1/dashboard/projection?months=0").status_code == 422
    assert client.get("/api/v1/dashboard/projection?months=25").status_code == 422
