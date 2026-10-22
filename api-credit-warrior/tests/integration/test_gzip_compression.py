import pytest
from fastapi.testclient import TestClient

from app.core.gzip_middleware import ContentNegotiatedGZipMiddleware


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        ("", False),
        ("identity", False),
        ("deflate", False),
        ("gzip", True),
        ("gzip, deflate", True),
        ("*", True),
        ("gzip;q=1.0", True),
        ("gzip;q=0.5", True),
        ("gzip;q=0", False),
        ("gzip;q=0.0", False),
        ("gzip;q=0.00", False),
        ("deflate;q=1.0, gzip;q=0", False),
        ("deflate;q=0.5, gzip;q=0.8", True),
    ],
)
def test_gzip_content_negotiation_quality_parser(header: str, expected: bool) -> None:
    assert ContentNegotiatedGZipMiddleware.is_gzip_accepted(header) is expected


def test_small_response_below_1000_bytes_is_not_compressed(client: TestClient) -> None:
    # /health response is ~45 bytes (< 1000 bytes)
    response = client.get("/health", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("Content-Encoding") is None
    assert response.json() == {"status": "ok", "service": "api-credit-warrior"}


def test_large_response_compressed_when_gzip_accepted(client: TestClient) -> None:
    # Seed 15 cards to make GET /api/v1/cards payload >= 1000 bytes
    for i in range(15):
        client.post(
            "/api/v1/cards",
            json={
                "name": f"GZip Test Credit Card Long Name #{i:02d}",
                "currency": "CLP",
                "closing_day": 20,
                "due_day": 5,
                "default_monthly_fee": "2500",
            },
        )

    response = client.get("/api/v1/cards", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert response.headers.get("Content-Encoding") == "gzip"

    # Verify decompressed body (httpx TestClient handles decompression when decoding json)
    cards = response.json()
    assert len(cards) == 15


def test_large_response_uncompressed_when_gzip_explicitly_rejected_q0(
    client: TestClient,
) -> None:
    # Seed 15 cards
    for i in range(15):
        client.post(
            "/api/v1/cards",
            json={
                "name": f"Reject GZip Card #{i:02d}",
                "currency": "CLP",
                "closing_day": 20,
                "due_day": 5,
                "default_monthly_fee": "2500",
            },
        )

    # Client explicitly rejects gzip via q=0
    response = client.get("/api/v1/cards", headers={"Accept-Encoding": "gzip;q=0"})
    assert response.status_code == 200
    assert response.headers.get("Content-Encoding") is None

    # Payload is readable directly as json without manual decompress
    data = response.json()
    assert len(data) == 15


def test_large_response_uncompressed_when_identity_requested(client: TestClient) -> None:
    for i in range(15):
        client.post(
            "/api/v1/cards",
            json={
                "name": f"Identity Card #{i:02d}",
                "currency": "CLP",
                "closing_day": 20,
                "due_day": 5,
                "default_monthly_fee": "2500",
            },
        )

    response = client.get("/api/v1/cards", headers={"Accept-Encoding": "identity"})
    assert response.status_code == 200
    assert response.headers.get("Content-Encoding") is None
    assert len(response.json()) == 15
