import uuid

from fastapi.testclient import TestClient


def test_create_and_get_person(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/persons",
        json={"name": "  Anyi  ", "color_hex": "#FF5733"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Anyi"
    assert data["color_hex"] == "#FF5733"
    assert data["is_active"] is True
    person_id = data["id"]

    get_resp = client.get(f"/api/v1/persons/{person_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Anyi"


def test_person_name_case_insensitive_uniqueness_and_self_patch(client: TestClient) -> None:
    p1 = client.post("/api/v1/persons", json={"name": "Anyi"}).json()
    client.post("/api/v1/persons", json={"name": "Augusto"})

    # Duplicate exact or case-insensitive rejected with 409 Conflict
    dup1 = client.post("/api/v1/persons", json={"name": "Anyi"})
    assert dup1.status_code == 409

    dup2 = client.post("/api/v1/persons", json={"name": "  anyi  "})
    assert dup2.status_code == 409

    # Updating p1 keeping its own name (even with different casing) succeeds
    self_patch = client.patch(
        f"/api/v1/persons/{p1['id']}",
        json={"name": "Anyi", "color_hex": "#112233"},
    )
    assert self_patch.status_code == 200
    assert self_patch.json()["color_hex"] == "#112233"

    # Updating p1 to collide with Augusto fails with 409 Conflict
    collision_patch = client.patch(
        f"/api/v1/persons/{p1['id']}",
        json={"name": "augusto"},
    )
    assert collision_patch.status_code == 409


def test_person_validation_errors(client: TestClient) -> None:
    assert client.post("/api/v1/persons", json={"name": "   "}).status_code == 422
    assert (
        client.post("/api/v1/persons", json={"name": "Anyi", "color_hex": "invalid"}).status_code
        == 422
    )
    assert (
        client.post("/api/v1/persons", json={"name": "Anyi", "extra": "forbidden"}).status_code
        == 422
    )


def test_list_filter_and_delete_person(client: TestClient) -> None:
    client.post("/api/v1/persons", json={"name": "Augusto", "is_active": True})
    p_inactive = client.post(
        "/api/v1/persons",
        json={"name": "Anyi", "is_active": False},
    ).json()

    all_persons = client.get("/api/v1/persons").json()
    assert [p["name"] for p in all_persons] == ["Anyi", "Augusto"]

    active_only = client.get("/api/v1/persons?is_active=true").json()
    assert [p["name"] for p in active_only] == ["Augusto"]

    del_resp = client.delete(f"/api/v1/persons/{p_inactive['id']}")
    assert del_resp.status_code == 204

    assert client.get(f"/api/v1/persons/{p_inactive['id']}").status_code == 404
    assert client.patch(f"/api/v1/persons/{uuid.uuid4()}", json={"name": "X"}).status_code == 404
    assert client.delete(f"/api/v1/persons/{uuid.uuid4()}").status_code == 404
