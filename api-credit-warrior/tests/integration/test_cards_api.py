import uuid
from decimal import Decimal

from fastapi.testclient import TestClient


def test_create_and_get_card(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cards",
        json={
            "name": "  Visa Santander  ",
            "last_four_digits": "9876",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Visa Santander"
    assert data["last_four_digits"] == "9876"
    assert data["currency"] == "CLP"
    assert data["closing_day"] == 25
    assert data["due_day"] == 10
    assert data["is_active"] is True
    assert Decimal(data["default_monthly_fee"]) == Decimal("0")
    card_id = data["id"]

    get_resp = client.get(f"/api/v1/cards/{card_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == card_id
    assert Decimal(get_resp.json()["default_monthly_fee"]) == Decimal("0")


def test_create_card_validation_errors(client: TestClient) -> None:
    # Invalid closing_day
    r1 = client.post(
        "/api/v1/cards",
        json={"name": "Card", "closing_day": 35, "due_day": 10},
    )
    assert r1.status_code == 422

    # Full PAN rejected (PII protection)
    r2 = client.post(
        "/api/v1/cards",
        json={
            "name": "Card",
            "closing_day": 20,
            "due_day": 5,
            "last_four_digits": "4111222233334444",
        },
    )
    assert r2.status_code == 422

    # Extra unknown field rejected
    r3 = client.post(
        "/api/v1/cards",
        json={"name": "Card", "closing_day": 20, "due_day": 5, "cvv": "123"},
    )
    assert r3.status_code == 422

    # Negative default_monthly_fee rejected
    r4 = client.post(
        "/api/v1/cards",
        json={"name": "Card", "closing_day": 20, "due_day": 5, "default_monthly_fee": -1},
    )
    assert r4.status_code == 422

    # Null default_monthly_fee rejected
    r5 = client.post(
        "/api/v1/cards",
        json={"name": "Card", "closing_day": 20, "due_day": 5, "default_monthly_fee": None},
    )
    assert r5.status_code == 422


def test_card_default_monthly_fee_create_patch_and_validations(client: TestClient) -> None:
    # Create card with custom default_monthly_fee
    created = client.post(
        "/api/v1/cards",
        json={
            "name": "Fee Card",
            "currency": "CLP",
            "closing_day": 20,
            "due_day": 5,
            "default_monthly_fee": 3500,
        },
    ).json()
    card_id = created["id"]
    assert Decimal(created["default_monthly_fee"]) == Decimal("3500")

    # PATCH card default_monthly_fee to 4200
    patch1 = client.patch(
        f"/api/v1/cards/{card_id}",
        json={"default_monthly_fee": 4200},
    )
    assert patch1.status_code == 200
    assert Decimal(patch1.json()["default_monthly_fee"]) == Decimal("4200")

    # PATCH card default_monthly_fee to 0
    patch2 = client.patch(
        f"/api/v1/cards/{card_id}",
        json={"default_monthly_fee": 0},
    )
    assert patch2.status_code == 200
    assert Decimal(patch2.json()["default_monthly_fee"]) == Decimal("0")

    # PATCH card default_monthly_fee negative -> 422
    patch_neg = client.patch(
        f"/api/v1/cards/{card_id}",
        json={"default_monthly_fee": -10},
    )
    assert patch_neg.status_code == 422

    # PATCH card default_monthly_fee null -> 422
    patch_null = client.patch(
        f"/api/v1/cards/{card_id}",
        json={"default_monthly_fee": None},
    )
    assert patch_null.status_code == 422


def test_list_and_filter_cards(client: TestClient) -> None:
    client.post(
        "/api/v1/cards",
        json={
            "name": "B Card USD",
            "currency": "USD",
            "closing_day": 15,
            "due_day": 28,
            "is_active": True,
        },
    )
    client.post(
        "/api/v1/cards",
        json={
            "name": "A Card CLP",
            "currency": "CLP",
            "closing_day": 20,
            "due_day": 5,
            "is_active": False,
        },
    )

    all_cards = client.get("/api/v1/cards").json()
    assert [c["name"] for c in all_cards] == ["A Card CLP", "B Card USD"]

    active_cards = client.get("/api/v1/cards?is_active=true").json()
    assert len(active_cards) == 1
    assert active_cards[0]["name"] == "B Card USD"

    clp_cards = client.get("/api/v1/cards?currency=CLP").json()
    assert len(clp_cards) == 1
    assert clp_cards[0]["name"] == "A Card CLP"


def test_patch_and_delete_card_and_404(client: TestClient) -> None:
    created = client.post(
        "/api/v1/cards",
        json={"name": "CMR", "closing_day": 10, "due_day": 25},
    ).json()
    card_id = created["id"]

    patch_resp = client.patch(
        f"/api/v1/cards/{card_id}",
        json={"closing_day": 12, "is_active": False},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["closing_day"] == 12
    assert patch_resp.json()["is_active"] is False
    assert patch_resp.json()["name"] == "CMR"

    del_resp = client.delete(f"/api/v1/cards/{card_id}")
    assert del_resp.status_code == 204

    assert client.get(f"/api/v1/cards/{card_id}").status_code == 404
    assert client.patch(f"/api/v1/cards/{uuid.uuid4()}", json={"name": "X"}).status_code == 404
    assert client.delete(f"/api/v1/cards/{uuid.uuid4()}").status_code == 404
