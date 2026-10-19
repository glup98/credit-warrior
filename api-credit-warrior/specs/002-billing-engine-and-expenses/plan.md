# Plan Técnico 002: Motor de Facturación On-the-Fly y Gestión de Compras Maestras (`Expense` & `ExpenseSplit`)

- **Spec de referencia:** [`specs/002-billing-engine-and-expenses/spec.md`](./spec.md)
- **Estado:** Borrador para aprobación

---

## 1. Arquitectura y Archivos a Crear / Modificar

| Capa | Archivo | Acción | Responsabilidad | RF Cubiertos |
| :--- | :--- | :--- | :--- | :--- |
| **Services (Pure Domain)** | `app/services/billing_engine.py` | Crear | Funciones puras: `YearMonth`, `effective_day_of_month`, `compute_first_statement_period`, `statement_to_payment_period`, `payment_to_statement_period`, `resolve_first_payment_period`, `get_installment_index`, `compute_installment_amount`, `compute_person_shares`. | `RF-01`–`RF-04` |
| **Models (ORM)** | `app/models/expense.py` | Crear | Modelos `Expense` y `ExpenseSplit` con `CheckConstraint` y `UniqueConstraint("expense_id", "person_id")`. | `RF-05`, `RF-08` |
| **Models (ORM)** | `app/models/card.py`, `app/models/person.py`, `app/models/__init__.py` | Modificar | Relaciones `expenses` / `splits` con `passive_deletes=True`. | `RF-05`, `RF-10` |
| **Schemas (DTO)** | `app/schemas/expense.py`, `app/schemas/__init__.py` | Crear / Modificar | `ExpenseSplitInput`, `ExpenseCreate`, `ExpenseUpdate`, `ExpenseRead`, `ExpenseScheduleResponse` con validadores de invariantes y `extra="forbid"`. | `RF-05`, `RF-06`, `RF-09` |
| **Repositories** | `app/repositories/expense_repo.py`, `app/repositories/person_repo.py` | Crear / Modificar | CRUD transaccional de `Expense` + `ExpenseSplit` con `selectinload`, filtros parametrizados y `get_by_ids`. | `RF-05`–`RF-08` |
| **Services** | `app/services/expense_service.py`, `app/services/card_service.py`, `app/services/person_service.py` | Crear / Modificar | Orquestación de gastos, filtro `active_in_period`, generación de `/schedule` y captura de `IntegrityError` (`409 Conflict`) al borrar tarjetas/personas en uso. | `RF-05`–`RF-10` |
| **API v1** | `app/api/v1/endpoints/expenses.py`, `app/api/v1/router.py` | Crear / Modificar | Endpoints REST `/api/v1/expenses` y `/api/v1/expenses/{expense_id}/schedule`. | `RF-05`–`RF-09` |
| **Tests** | `tests/conftest.py`, `tests/unit/test_billing_engine.py`, `tests/unit/test_splits.py`, `tests/unit/test_schemas_expenses.py`, `tests/integration/test_expenses_api.py` | Crear / Modificar | Habilitar `PRAGMA foreign_keys=ON` en SQLite in-memory y suites de tests unitarios e integración. | `RF-01`–`RF-10` |

---

## 2. Decisiones Técnicas y Alternativas Descartadas

1. **Objeto de Valor Inmutable `YearMonth(year, month)` en `billing_engine.py`:**
   - *Decisión:* Representar los períodos `YYYY-MM` con un `@dataclass(frozen=True, order=True)` que encapsula la aritmética modular base 12 (`add_months(delta)`) y el parseo seguro.
   - *Alternativa descartada:* Manipular strings `"YYYY-MM"` o `datetime.date` con día arbitrario (`day=1`) repartidos por distintos módulos, propenso a errores de desbordamiento en diciembre/enero.
2. **Activación de `PRAGMA foreign_keys=ON` en SQLite para Tests (`tests/conftest.py`) + Manejo de `IntegrityError`:**
   - *Decisión:* Escuchar el evento `connect` del engine SQLite de pruebas para activar `PRAGMA foreign_keys=ON`. En `CardService.delete_card` y `PersonService.delete_person`, capturar `IntegrityError` al hacer `delete`/`commit`, hacer `rollback()` y lanzar `ConflictError` (`409 Conflict`).
   - *Alternativa descartada:* No activar `PRAGMA foreign_keys=ON` en SQLite, lo que haría que `ondelete="RESTRICT"` solo se verificara en PostgreSQL y pasara desapercibido en `pytest`.
3. **Reemplazo Atómico de `splits` en `PUT /api/v1/expenses/{id}`:**
   - *Decisión:* Limpiar la colección `expense.splits.clear()`, ejecutar `db.flush()` para respetar `UniqueConstraint("expense_id", "person_id")` y añadir los nuevos `ExpenseSplit` dentro de la misma transacción antes de `db.commit()`.
   - *Alternativa descartada:* Hacer `commit()` intermedio entre el borrado y la inserción de splits, lo que dejaría el gasto sin splits si fallara el segundo paso.

---

## 3. Verification Plan

### Estrategia de Tests (`pytest`)
- **Tests Unitarios del Motor Puro (`tests/unit/test_billing_engine.py` & `tests/unit/test_splits.py`):**
  - Ciclos de corte antes, en el mismo día y después de `closing_day`, meses de 28/29/30 días (bisiestos y no bisiestos) y cruce de año (`RF-01`, `RF-02`).
  - Cálculo de cuotas en `CLP` (`$100.000` en 3 cuotas $\rightarrow$ `33334`, `33333`, `33333`) y `USD` (`$100.00` en 3 cuotas $\rightarrow$ `33.34`, `33.33`, `33.33`) verificando suma exacta (`RF-03`).
  - Prorrateo de splits `EQUAL`, `PERCENTAGE` y `FIXED_AMOUNT` verificando absorción de residuo en el último participante (`RF-04`).
- **Tests Unitarios de Esquemas (`tests/unit/test_schemas_expenses.py`):**
  - Rechazo de `splits` vacíos, personas duplicadas, tipos mezclados, porcentajes $\ne 100$ y montos fijos $\ne \text{total\_amount}$ (`RF-06`).
- **Tests de Integración de API (`tests/integration/test_expenses_api.py`):**
  - `POST`, `GET` (con filtros `card_id`, `person_id`, `date_from`, `date_to`, `active_in_period`), `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/schedule` y bloqueo `409 Conflict` al intentar borrar una `Card` o `Person` con compras asociadas (`RF-05`–`RF-10`).

### Automated Security Check
- **Security Scanner**: Run a scan on all newly created files to identify common vulnerabilities (e.g., XSS, SQL injection). If findings are detected, auto-apply the fix and document the results.
- **Security Audit**: Audit the new code for design-level security issues (input validation, secrets handling, auth checks). Document findings and remediations in the `walkthrough.md` artifact using the `generate_security_audit_report` skill.
