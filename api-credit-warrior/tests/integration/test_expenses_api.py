import uuid

from fastapi.testclient import TestClient


def _seed_card_and_persons(client: TestClient) -> tuple[str, str, str]:
    card = client.post(
        "/api/v1/cards",
        json={
            "name": "Visa Santander",
            "last_four_digits": "1234",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
        },
    ).json()
    p1 = client.post("/api/v1/persons", json={"name": "Anyi"}).json()
    p2 = client.post("/api/v1/persons", json={"name": "Augusto"}).json()
    return card["id"], p1["id"], p2["id"]


def test_create_get_schedule_and_filter_expenses_rf05_rf07_rf09(client: TestClient) -> None:
    card_id, p1_id, p2_id = _seed_card_and_persons(client)

    # Purchase on 2026-10-16 (<= closing_day 25) -> statement 2026-10 -> first payment 2026-11
    create_resp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_id,
            "description": "Refrigerador",
            "total_amount": "100000",
            "purchase_date": "2026-10-16",
            "installments_count": 3,
            "splits": [
                {"person_id": p1_id, "split_type": "EQUAL"},
                {"person_id": p2_id, "split_type": "EQUAL"},
            ],
        },
    )
    assert create_resp.status_code == 201
    expense = create_resp.json()
    expense_id = expense["id"]
    assert len(expense["splits"]) == 2

    # Schedule endpoint (RF-09): 3 installments in 2026-11, 2026-12, 2027-01
    sched_resp = client.get(f"/api/v1/expenses/{expense_id}/schedule")
    assert sched_resp.status_code == 200
    sched = sched_resp.json()
    assert sched["installments_count"] == 3
    periods = [item["payment_period"] for item in sched["schedule"]]
    assert periods == ["2026-11", "2026-12", "2027-01"]
    amounts = [item["installment_amount"] for item in sched["schedule"]]
    assert amounts == ["33334", "33333", "33333"]
    # Check 50/50 split on odd installment #2 (33333 -> 16667 + 16666)
    shares_k2 = [sh["amount"] for sh in sched["schedule"][1]["person_shares"]]
    assert shares_k2 == ["16667", "16666"]

    # Filtering by active_in_period (RF-07)
    assert len(client.get("/api/v1/expenses?active_in_period=2026-10").json()) == 0
    assert len(client.get("/api/v1/expenses?active_in_period=2026-11").json()) == 1
    assert len(client.get("/api/v1/expenses?active_in_period=2027-01").json()) == 1
    assert len(client.get("/api/v1/expenses?active_in_period=2027-02").json()) == 0


def test_expense_not_found_and_unknown_references_rf06(client: TestClient) -> None:
    card_id, p1_id, _ = _seed_card_and_persons(client)

    # Unknown card_id -> 404
    r_card = client.post(
        "/api/v1/expenses",
        json={
            "card_id": str(uuid.uuid4()),
            "description": "Test",
            "total_amount": "10000",
            "purchase_date": "2026-10-16",
            "installments_count": 1,
            "splits": [{"person_id": p1_id, "split_type": "EQUAL"}],
        },
    )
    assert r_card.status_code == 404

    # Unknown person_id -> 404
    r_person = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_id,
            "description": "Test",
            "total_amount": "10000",
            "purchase_date": "2026-10-16",
            "installments_count": 1,
            "splits": [{"person_id": str(uuid.uuid4()), "split_type": "EQUAL"}],
        },
    )
    assert r_person.status_code == 404


def test_update_delete_expense_and_referential_integrity_rf08_rf10(client: TestClient) -> None:
    card_id, p1_id, p2_id = _seed_card_and_persons(client)

    exp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card_id,
            "description": "Cena",
            "total_amount": "50000",
            "purchase_date": "2026-10-16",
            "installments_count": 1,
            "splits": [
                {"person_id": p1_id, "split_type": "EQUAL"},
                {"person_id": p2_id, "split_type": "EQUAL"},
            ],
        },
    ).json()
    expense_id = exp["id"]

    # RF-10: Cannot delete card or person while referenced by an expense
    assert client.delete(f"/api/v1/cards/{card_id}").status_code == 409
    assert client.delete(f"/api/v1/persons/{p1_id}").status_code == 409

    # RF-08: PUT replaces splits atomically
    put_resp = client.put(
        f"/api/v1/expenses/{expense_id}",
        json={
            "card_id": card_id,
            "description": "Cena Actualizada",
            "total_amount": "60000",
            "purchase_date": "2026-10-16",
            "installments_count": 2,
            "splits": [
                {"person_id": p1_id, "split_type": "PERCENTAGE", "percentage": "75.00"},
                {"person_id": p2_id, "split_type": "PERCENTAGE", "percentage": "25.00"},
            ],
        },
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["description"] == "Cena Actualizada"
    assert put_resp.json()["splits"][0]["split_type"] == "PERCENTAGE"

    # RF-08: DELETE expense
    del_resp = client.delete(f"/api/v1/expenses/{expense_id}")
    assert del_resp.status_code == 204
    assert client.get(f"/api/v1/expenses/{expense_id}").status_code == 404

    # Now card and person can be deleted cleanly
    assert client.delete(f"/api/v1/persons/{p1_id}").status_code == 204
    assert client.delete(f"/api/v1/cards/{card_id}").status_code == 204
