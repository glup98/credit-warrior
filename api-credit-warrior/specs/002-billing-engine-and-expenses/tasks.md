# Tareas 002: Motor de Facturación On-the-Fly y Gestión de Compras Maestras (`Expense` & `ExpenseSplit`)

- **Spec:** [`specs/002-billing-engine-and-expenses/spec.md`](./spec.md)
- **Plan:** [`specs/002-billing-engine-and-expenses/plan.md`](./plan.md)

---

## Lista de Tareas (Orden de Ejecución TDD)

- [x] **T1 — Motor Financiero Puro (`app/services/billing_engine.py`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`, `RF-04`.
  - **Archivos:** `app/services/billing_engine.py`, `tests/unit/test_billing_engine.py`, `tests/unit/test_splits.py`.
  - **Hecho cuando:** Todos los tests unitarios de ciclos de facturación (incluyendo bisiestos y cruces de año), cuotas *on-the-fly* (`CLP` y `USD` con residuo en `k=1`) y prorrateo de splits (`EQUAL`, `PERCENTAGE`, `FIXED_AMOUNT`) pasan al 100% en `pytest`, `ruff` y `mypy`.

- [x] **T2 — Modelos ORM (`Expense`, `ExpenseSplit`), Relaciones y `PRAGMA foreign_keys=ON`**
  - **RF cubiertos:** Base de persistencia e integridad referencial para `RF-05`, `RF-08`, `RF-10`.
  - **Archivos:** `app/models/expense.py`, `app/models/card.py`, `app/models/person.py`, `app/models/__init__.py`, `tests/conftest.py`, `tests/unit/test_models_expenses.py`.
  - **Hecho cuando:** Los tests unitarios verifican creación de `Expense` con `ExpenseSplit`, borrado en cascada de splits al borrar el gasto y restricción `IntegrityError` al intentar borrar `Card` o `Person` referenciadas.

- [x] **T3 — Esquemas Pydantic V2 de Compras y Cronograma (`app/schemas/expense.py`)**
  - **RF cubiertos:** `RF-05`, `RF-06`, `RF-09`.
  - **Archivos:** `app/schemas/expense.py`, `app/schemas/__init__.py`, `tests/unit/test_schemas_expenses.py`.
  - **Hecho cuando:** Los tests unitarios verifican todas las reglas de validación de `ExpenseCreate`/`ExpenseUpdate` (`total_amount > 0`, `installments_count` `1..120`, `first_billing_override`, no duplicados en `splits`, suma de porcentajes `== 100`, suma de montos fijos `== total_amount` y `extra="forbid"`).

- [x] **T4 — Repositorio, Servicio, Endpoints `/api/v1/expenses` (+ `/schedule`) y Protección `409 Conflict` en `Card`/`Person`**
  - **RF cubiertos:** `RF-05`, `RF-06`, `RF-07`, `RF-08`, `RF-09`, `RF-10`.
  - **Archivos:** `app/repositories/expense_repo.py`, `app/repositories/person_repo.py`, `app/services/expense_service.py`, `app/services/card_service.py`, `app/services/person_service.py`, `app/api/v1/endpoints/expenses.py`, `app/api/v1/router.py`, `tests/integration/test_expenses_api.py`.
  - **Hecho cuando:** Todos los tests de integración (`POST`, `GET` con filtros y `active_in_period`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/schedule` y `409 Conflict` al borrar tarjeta/persona con gastos) pasan al 100% en `pytest`, `ruff` y `mypy`.
