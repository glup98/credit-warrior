import uuid
from decimal import Decimal

from fastapi.testclient import TestClient


def _seed_card(
    client: TestClient,
    name: str = "Santander Life",
    currency: str = "CLP",
    default_monthly_fee: str | int = "3000",
) -> str:
    res = client.post(
        "/api/v1/cards",
        json={
            "name": name,
            "currency": currency,
            "closing_day": 20,
            "due_day": 5,
            "default_monthly_fee": default_monthly_fee,
        },
    )
    assert res.status_code == 201
    card_id: str = res.json()["id"]
    return card_id


def test_put_card_fee_creates_override_and_is_idempotent(client: TestClient) -> None:
    card_id = _seed_card(client, default_monthly_fee=3000)

    # 1. Create fee override for period 2026-11
    res1 = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={"fee": 4500},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["card_id"] == card_id
    assert data1["period"] == "2026-11"
    assert Decimal(data1["fee"]) == Decimal("4500")
    assert data1["source"] == "OVERRIDE"

    # 2. Idempotent update for same period
    res2 = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={"fee": "5200"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["card_id"] == card_id
    assert data2["period"] == "2026-11"
    assert Decimal(data2["fee"]) == Decimal("5200")
    assert data2["source"] == "OVERRIDE"


def test_put_card_fee_validations(client: TestClient) -> None:
    card_id = _seed_card(client)
    random_card_id = uuid.uuid4()

    # 404 on non-existent card
    res_404 = client.put(
        f"/api/v1/cards/{random_card_id}/fees/2026-11",
        json={"fee": 1000},
    )
    assert res_404.status_code == 404

    # 422 on invalid period format
    res_period_month = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-13",
        json={"fee": 1000},
    )
    assert res_period_month.status_code == 422

    res_period_str = client.put(
        f"/api/v1/cards/{card_id}/fees/not-a-period",
        json={"fee": 1000},
    )
    assert res_period_str.status_code == 422

    # 422 on negative fee
    res_neg = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={"fee": -100},
    )
    assert res_neg.status_code == 422

    # 422 on null fee
    res_null = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={"fee": None},
    )
    assert res_null.status_code == 422

    # 422 on missing fee
    res_missing = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={},
    )
    assert res_missing.status_code == 422

    # 422 on extra fields (extra="forbid")
    res_extra = client.put(
        f"/api/v1/cards/{card_id}/fees/2026-11",
        json={"fee": 1000, "extra": "forbidden"},
    )
    assert res_extra.status_code == 422


def test_get_card_fees_list_empty_and_ordered(client: TestClient) -> None:
    card_id = _seed_card(client)

    # Initially empty list
    res_empty = client.get(f"/api/v1/cards/{card_id}/fees")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # Non-existent card returns 404
    res_404 = client.get(f"/api/v1/cards/{uuid.uuid4()}/fees")
    assert res_404.status_code == 404

    # Add overrides in non-chronological order
    client.put(f"/api/v1/cards/{card_id}/fees/2026-12", json={"fee": 6000})
    client.put(f"/api/v1/cards/{card_id}/fees/2026-05", json={"fee": 4000})
    client.put(f"/api/v1/cards/{card_id}/fees/2026-09", json={"fee": 5000})

    # Retrieve list, must be sorted chronologically ascending
    res_list = client.get(f"/api/v1/cards/{card_id}/fees")
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) == 3
    assert [item["period"] for item in items] == ["2026-05", "2026-09", "2026-12"]
    expected_fees = [Decimal("4000"), Decimal("5000"), Decimal("6000")]
    assert [Decimal(item["fee"]) for item in items] == expected_fees
    assert all(item["source"] == "OVERRIDE" for item in items)


def test_get_card_fee_period_source_override_and_default(client: TestClient) -> None:
    card_id = _seed_card(client, default_monthly_fee="2500")

    # 1. Period with no override -> returns CARD_DEFAULT source and card's default_monthly_fee
    res_default = client.get(f"/api/v1/cards/{card_id}/fees/2026-04")
    assert res_default.status_code == 200
    data_default = res_default.json()
    assert data_default["card_id"] == card_id
    assert data_default["period"] == "2026-04"
    assert Decimal(data_default["fee"]) == Decimal("2500")
    assert data_default["source"] == "CARD_DEFAULT"

    # 2. Period with override -> returns OVERRIDE source and override fee
    client.put(f"/api/v1/cards/{card_id}/fees/2026-04", json={"fee": 3800})
    res_override = client.get(f"/api/v1/cards/{card_id}/fees/2026-04")
    assert res_override.status_code == 200
    data_override = res_override.json()
    assert data_override["card_id"] == card_id
    assert data_override["period"] == "2026-04"
    assert Decimal(data_override["fee"]) == Decimal("3800")
    assert data_override["source"] == "OVERRIDE"


def test_get_card_fee_validations(client: TestClient) -> None:
    card_id = _seed_card(client)

    # 404 on non-existent card
    assert client.get(f"/api/v1/cards/{uuid.uuid4()}/fees/2026-01").status_code == 404

    # 422 on invalid period format
    assert client.get(f"/api/v1/cards/{card_id}/fees/2026-13").status_code == 422
    assert client.get(f"/api/v1/cards/{card_id}/fees/invalid").status_code == 422


def test_delete_card_fee_success_and_reverts_to_default(client: TestClient) -> None:
    card_id = _seed_card(client, default_monthly_fee="3000")

    # Register override
    client.put(f"/api/v1/cards/{card_id}/fees/2026-08", json={"fee": 5500})
    check_override = client.get(f"/api/v1/cards/{card_id}/fees/2026-08").json()
    assert check_override["source"] == "OVERRIDE"
    assert Decimal(check_override["fee"]) == Decimal("5500")

    # Delete override -> 204 No Content
    del_res = client.delete(f"/api/v1/cards/{card_id}/fees/2026-08")
    assert del_res.status_code == 204

    # Now get fee for 2026-08 reverts to CARD_DEFAULT
    check_default = client.get(f"/api/v1/cards/{card_id}/fees/2026-08").json()
    assert check_default["source"] == "CARD_DEFAULT"
    assert Decimal(check_default["fee"]) == Decimal("3000")

    # Override is removed from list
    list_res = client.get(f"/api/v1/cards/{card_id}/fees").json()
    assert len(list_res) == 0


def test_delete_card_fee_non_existent_override_returns_404(client: TestClient) -> None:
    card_id = _seed_card(client)

    # Period has default fee but no override registered -> delete must return 404
    del_res = client.delete(f"/api/v1/cards/{card_id}/fees/2026-08")
    assert del_res.status_code == 404


def test_delete_card_fee_validations(client: TestClient) -> None:
    card_id = _seed_card(client)

    # Non-existent card returns 404
    assert client.delete(f"/api/v1/cards/{uuid.uuid4()}/fees/2026-01").status_code == 404

    # Invalid period format returns 422
    assert client.delete(f"/api/v1/cards/{card_id}/fees/2026-00").status_code == 422
    assert client.delete(f"/api/v1/cards/{card_id}/fees/not-period").status_code == 422


def test_card_fee_usd_precision_quantization(client: TestClient) -> None:
    usd_card_id = _seed_card(client, currency="USD", default_monthly_fee="10.50")

    # Check default fee is quantized to 2 decimals for USD
    res_default = client.get(f"/api/v1/cards/{usd_card_id}/fees/2026-05")
    assert res_default.status_code == 200
    assert Decimal(res_default.json()["fee"]) == Decimal("10.50")

    # Set override with precision
    res_override = client.put(
        f"/api/v1/cards/{usd_card_id}/fees/2026-05",
        json={"fee": "15.75"},
    )
    assert res_override.status_code == 200
    assert Decimal(res_override.json()["fee"]) == Decimal("15.75")
