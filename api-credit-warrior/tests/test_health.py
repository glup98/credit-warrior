from fastapi.testclient import TestClient


def test_health_check_returns_ok_and_security_headers(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "api-credit-warrior"}
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Cache-Control") == "no-store"


def test_openapi_schema_and_swagger_ui_endpoints(client: TestClient) -> None:
    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    schema = openapi_resp.json()
    assert schema["info"]["title"] == "Credit Warrior API"
    assert "/api/v1/cards" in schema["paths"]
    assert "/api/v1/persons" in schema["paths"]
    assert "/api/v1/expenses" in schema["paths"]
    assert "/api/v1/dashboard/summary" in schema["paths"]

    docs_resp = client.get("/docs")
    assert docs_resp.status_code == 200
    assert "cdn.jsdelivr.net" in docs_resp.headers.get("Content-Security-Policy", "")
