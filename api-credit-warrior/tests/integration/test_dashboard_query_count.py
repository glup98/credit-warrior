import contextlib
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import event

from tests.conftest import TEST_ENGINE


@contextlib.contextmanager
def capture_queries() -> Generator[list[str], None, None]:
    """Capture all SQL statements executed on TEST_ENGINE within the context."""
    executed: list[str] = []

    def _listener(conn, cursor, statement, parameters, context, executemany) -> None:  # type: ignore[no-untyped-def]
        # Ignore transaction boundary statements if any
        stmt_clean = statement.strip().upper()
        if not stmt_clean.startswith(("BEGIN", "COMMIT", "ROLLBACK")):
            executed.append(statement)

    event.listen(TEST_ENGINE, "before_cursor_execute", _listener)
    try:
        yield executed
    finally:
        event.remove(TEST_ENGINE, "before_cursor_execute", _listener)


def _seed_test_data(client: TestClient) -> dict[str, str]:
    # 1. Create two cards
    c1_resp = client.post(
        "/api/v1/cards",
        json={
            "name": "Visa Banco Chile",
            "currency": "CLP",
            "closing_day": 20,
            "due_day": 5,
            "default_monthly_fee": "3500",
        },
    )
    assert c1_resp.status_code == 201
    card1_id = c1_resp.json()["id"]

    c2_resp = client.post(
        "/api/v1/cards",
        json={
            "name": "Mastercard BCI",
            "currency": "CLP",
            "closing_day": 25,
            "due_day": 10,
            "default_monthly_fee": "4200",
        },
    )
    assert c2_resp.status_code == 201
    card2_id = c2_resp.json()["id"]

    # 2. Create two persons
    p1_resp = client.post("/api/v1/persons", json={"name": "Alice"})
    assert p1_resp.status_code == 201
    person1_id = p1_resp.json()["id"]

    p2_resp = client.post("/api/v1/persons", json={"name": "Bob"})
    assert p2_resp.status_code == 201
    person2_id = p2_resp.json()["id"]

    # 3. Create purchases across cards with splits
    exp1_resp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card1_id,
            "description": "Supermercado 12 cuotas",
            "total_amount": "120000",
            "purchase_date": "2026-10-15",
            "installments_count": 12,
            "splits": [
                {"person_id": person1_id, "split_type": "PERCENTAGE", "percentage": "60.00"},
                {"person_id": person2_id, "split_type": "PERCENTAGE", "percentage": "40.00"},
            ],
        },
    )
    assert exp1_resp.status_code == 201

    exp2_resp = client.post(
        "/api/v1/expenses",
        json={
            "card_id": card2_id,
            "description": "Viaje 24 cuotas",
            "total_amount": "480000",
            "purchase_date": "2026-10-10",
            "installments_count": 24,
            "splits": [
                {"person_id": person1_id, "split_type": "EQUAL"},
                {"person_id": person2_id, "split_type": "EQUAL"},
            ],
        },
    )
    assert exp2_resp.status_code == 201

    # 4. Create maintenance fee overrides for some periods
    client.put(f"/api/v1/cards/{card1_id}/fees/2026-11", json={"fee": "5000"})
    client.put(f"/api/v1/cards/{card2_id}/fees/2026-12", json={"fee": "6000"})

    return {
        "card1_id": card1_id,
        "card2_id": card2_id,
        "person1_id": person1_id,
        "person2_id": person2_id,
    }


def test_dashboard_projection_query_count_is_constant_and_max_5_queries(
    client: TestClient,
) -> None:
    _seed_test_data(client)

    query_counts: dict[int, int] = {}
    for months in (1, 6, 12, 24):
        with capture_queries() as queries:
            response = client.get(
                f"/api/v1/dashboard/projection?start_period=2026-11&months={months}"
            )
            assert response.status_code == 200
            assert len(response.json()["periods"]) == months
            query_counts[months] = len(queries)

    # Invariant: Physical queries never exceed 5 regardless of horizon length
    for months, count in query_counts.items():
        assert count <= 5, f"months={months} executed {count} queries (expected <= 5)"

    # Strict invariant: Query count is strictly constant between 1, 6, 12 and 24 months
    assert query_counts[1] == query_counts[6] == query_counts[12] == query_counts[24]


def test_dashboard_summary_uses_batch_fee_fetch(client: TestClient) -> None:
    _seed_test_data(client)

    with capture_queries() as queries:
        response = client.get("/api/v1/dashboard/summary?period=2026-11")
        assert response.status_code == 200

    # 4 queries for selectinload graph of expenses + 1 query for batch fees
    assert len(queries) <= 5
