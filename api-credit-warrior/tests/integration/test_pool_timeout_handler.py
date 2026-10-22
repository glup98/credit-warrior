from fastapi.testclient import TestClient
from sqlalchemy.exc import TimeoutError as SATimeoutError

from app.core.database import get_db
from app.main import app


def test_pool_timeout_returns_http_503_service_unavailable(client: TestClient) -> None:
    def _raise_timeout() -> None:
        raise SATimeoutError(
            "QueuePool limit of size 10 overflow 20 reached, connection timed out, timeout 30.00"
        )

    app.dependency_overrides[get_db] = _raise_timeout
    try:
        response = client.get("/api/v1/cards")
        assert response.status_code == 503
        assert response.json() == {
            "detail": "Database connection pool saturated. Service temporarily unavailable."
        }
    finally:
        app.dependency_overrides.clear()
