# Tareas 001: Gestión de Tarjetas (`Card`) y Personas (`Person`)

- **Spec:** [`specs/001-cards-and-persons/spec.md`](./spec.md)
- **Plan:** [`specs/001-cards-and-persons/plan.md`](./plan.md)

---

## Lista de Tareas (Orden de Ejecución TDD)

- [x] **T1 — Modelos ORM (`Card`, `Person`), Excepción `ConflictError` y Fixture de DB en `conftest.py`**
  - **RF cubiertos:** Base estructural para `RF-01` a `RF-11`.
  - **Archivos:** `app/models/card.py`, `app/models/person.py`, `app/models/__init__.py`, `app/core/exceptions.py`, `tests/conftest.py`, `tests/unit/test_models_cards_persons.py`.
  - **Hecho cuando:** Los tests unitarios de creación/persistencia de `Card` y `Person` en SQLite in-memory pasan en verde con `pytest`, y `ruff check .` + `mypy app` no reportan errores.

- [x] **T2 — Esquemas Pydantic V2 (`CardCreate`, `CardUpdate`, `CardRead`, `PersonCreate`, `PersonUpdate`, `PersonRead`)**
  - **RF cubiertos:** `RF-02`, `RF-09`.
  - **Archivos:** `app/schemas/card.py`, `app/schemas/person.py`, `app/schemas/__init__.py`, `tests/unit/test_schemas_cards_persons.py`.
  - **Hecho cuando:** Los tests unitarios verifican el recorte (`strip()`) de nombres, rechazo de cadenas en blanco, validación de `closing_day`/`due_day` (1..31), `last_four_digits` (`^\d{4}$`), `color_hex` (`^#[0-9A-Fa-f]{6}$`) y `extra="forbid"`, con `pytest`, `ruff` y `mypy` en verde.

- [x] **T3 — Repositorio, Servicio y Endpoints REST de Tarjetas (`/api/v1/cards`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`, `RF-06`.
  - **Archivos:** `app/repositories/card_repo.py`, `app/services/card_service.py`, `app/api/v1/endpoints/cards.py`, `app/api/v1/router.py`, `tests/integration/test_cards_api.py`.
  - **Hecho cuando:** Todos los tests de integración en `tests/integration/test_cards_api.py` (`POST`, `GET` con filtros `is_active`/`currency`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `404` y `422`) pasan al 100% en `pytest`, `ruff` y `mypy`.

- [x] **T4 — Repositorio, Servicio y Endpoints REST de Personas (`/api/v1/persons`)**
  - **RF cubiertos:** `RF-07`, `RF-08`, `RF-09`, `RF-10`, `RF-11`.
  - **Archivos:** `app/repositories/person_repo.py`, `app/services/person_service.py`, `app/api/v1/endpoints/persons.py`, `app/api/v1/router.py`, `tests/integration/test_persons_api.py`.
  - **Hecho cuando:** Todos los tests de integración en `tests/integration/test_persons_api.py` (`POST`, `409 Conflict` case-insensitive, `PATCH` conservando el propio nombre, `GET` con filtro `is_active`, `GET /{id}`, `DELETE /{id}`, `404` y `422`) pasan al 100% en `pytest`, `ruff` y `mypy`, y se actualiza `MEMORY.md`.
