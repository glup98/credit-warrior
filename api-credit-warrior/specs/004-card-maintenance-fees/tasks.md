# Tareas 004: Costos de Mantención Mensual por Tarjeta y Reparto Dinámico

- **Spec:** [`specs/004-card-maintenance-fees/spec.md`](./spec.md)
- **Plan:** [`specs/004-card-maintenance-fees/plan.md`](./plan.md)
- **Metodología:** TDD estricto (rojo -> verde -> refactor) en cada tarea atómica.

---

## Lista de Tareas (Orden de Ejecución Secuencial TDD)

- [x] **T1 — Modelo de Datos y Migración Alembic (`Card.default_monthly_fee` y Entidad `CardMonthlyFee`)**
  - **RF cubiertos:** `RF-01`, `RF-02`.
  - **Archivos:** `app/models/base.py`, `app/models/card.py`, `app/models/card_monthly_fee.py`, `app/models/__init__.py`, `alembic/versions/6395abdeaa39_add_card_monthly_fees.py`, `tests/unit/test_models_card_fees.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_models_card_fees.py` que comprueban la persistencia de `default_monthly_fee` en `Card`, el constraint `ck_cards_default_monthly_fee_non_negative`, la entidad `CardMonthlyFee` con constraint de unicidad `(card_id, period)` y constraint `fee >= 0`, y la cascada de eliminación (rojo).
    2. Se implementan los modelos en `app/models/` y el archivo de migración en `alembic/versions/` (verde).
    3. `pytest tests/unit/test_models_card_fees.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T2 — Esquemas Pydantic para Mantención y Tarjetas (`app/schemas/card_fee.py` y Actualización de `CardBase`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-05`.
  - **Archivos:** `app/schemas/card_fee.py`, `app/schemas/card.py`, `app/schemas/__init__.py`, `tests/unit/test_schemas_card_fees.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_schemas_card_fees.py` que verifican validación de `default_monthly_fee` en `CardCreate`/`CardUpdate` (rechazo de `null` y negativos con 422), rechazo de campos extra (`extra="forbid"`), validación de `CardMonthlyFeeCreateOrUpdate` y formato regex `YYYY-MM` en `CardMonthlyFeeResponse` (rojo).
    2. Se implementan los esquemas en `app/schemas/card_fee.py` y se actualiza `app/schemas/card.py` (verde).
    3. `pytest tests/unit/test_schemas_card_fees.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T3 — Funciones Puras en el Motor Financiero (`billing_engine.py`)**
  - **RF cubiertos:** `RF-06`, `RF-07`, `RF-08`.
  - **Archivos:** `app/services/billing_engine.py`, `tests/unit/test_billing_engine_fees.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_billing_engine_fees.py` verificando: `resolve_card_monthly_fee` (retorna `0` ante inactividad o sin compras); `prorate_maintenance_fee` (retorna `0` si tarifa es `0` o lista vacía; 1 participante asume 100%; prorrateo con `ROUND_FLOOR` para CLP y USD; ordenamiento ascendente por UUID; absorción del residuo en el último participante; y verificación estricta de $\text{share}_M \ge \text{base\_share} \ge 0$) (rojo).
    2. Se implementan `ParticipantFeeShare`, `resolve_card_monthly_fee` y `prorate_maintenance_fee` como funciones puras en `app/services/billing_engine.py` (verde).
    3. `pytest tests/unit/test_billing_engine_fees.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T4 — Repositorio de Tarifas de Mantención (`CardFeeRepository`)**
  - **RF cubiertos:** `RF-02`, `RF-03`, `RF-04`.
  - **Archivos:** `app/repositories/card_fee_repo.py`, `app/repositories/__init__.py`, `tests/unit/test_card_fee_repo.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_card_fee_repo.py` verificando upsert idempotente por `(card_id, period)`, consulta `get_by_card_and_period`, listado ascendente ordenado cronológicamente por `period`, y eliminación con retorno booleano correcto (rojo).
    2. Se implementa `CardFeeRepository` utilizando consultas parametrizadas de SQLAlchemy 2.0 (verde).
    3. `pytest tests/unit/test_card_fee_repo.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T5 — Servicio de Dominio para Tarifas de Mantención (`CardFeeService`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`.
  - **Archivos:** `app/services/card_fee_service.py`, `tests/unit/test_card_fee_service.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_card_fee_service.py` verificando: `set_fee` (retorna DTO con `source="OVERRIDE"`), `get_fee` (retorna `source="OVERRIDE"` si existe registro explícito o `source="CARD_DEFAULT"` con `card.default_monthly_fee`), `list_fees`, `delete_fee` (lanza `EntityNotFoundError` si no existe override en ese período), y lanzamiento de `EntityNotFoundError` ante `card_id` inexistente (rojo).
    2. Se implementa `CardFeeService` orquestando repositorios y normalizando montos según la moneda de la tarjeta (verde).
    3. `pytest tests/unit/test_card_fee_service.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T6 — Endpoints REST de Mantención de Tarjetas (`/api/v1/cards/{card_id}/fees`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`.
  - **Archivos:** `app/api/v1/endpoints/card_fees.py`, `app/api/v1/endpoints/cards.py`, `app/api/v1/router.py`, `tests/integration/test_card_fees_api.py`, `tests/integration/test_cards_api.py`.
  - **Hecho cuando:**
    1. Se escriben tests de integración en `tests/integration/test_card_fees_api.py` y `test_cards_api.py` verificando: creación/edición de tarjeta con `default_monthly_fee`, `PUT /cards/{card_id}/fees/{period}` con `200 OK`, `GET /cards/{card_id}/fees` ordenado, `GET /cards/{card_id}/fees/{period}` con `source`, `DELETE` con `204` y `404` ante override inexistente, y validaciones `404`/`422` (rojo).
    2. Se implementan los endpoints y se registran en `app/api/v1/router.py` (verde).
    3. `pytest tests/integration/test_card_fees_api.py tests/integration/test_cards_api.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T7 — Extensión Compatible de Esquemas del Dashboard (`app/schemas/dashboard.py`)**
  - **RF cubiertos:** `RF-09`.
  - **Archivos:** `app/schemas/dashboard.py`, `tests/unit/test_schemas_dashboard_fees.py`.
  - **Hecho cuando:**
    1. Se escriben tests en `tests/unit/test_schemas_dashboard_fees.py` verificando que `CardMonthlySummary` expone `purchases_total`, `maintenance_fee` y `total_due`, y `CardPersonBreakdown` expone `purchases_amount`, `fee_share` y `amount_due`, preservando serialización y valores por defecto retrocompatibles (rojo).
    2. Se extienden los modelos Pydantic en `app/schemas/dashboard.py` (verde).
    3. `pytest tests/unit/test_schemas_dashboard_fees.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T8 — Integración de Mantención en Resumen Mensual (`DashboardService.get_monthly_summary`)**
  - **RF cubiertos:** `RF-06`, `RF-07`, `RF-08`, `RF-09`.
  - **Archivos:** `app/services/dashboard_service.py`, `tests/integration/test_dashboard_fees_summary.py`.
  - **Hecho cuando:**
    1. Se escriben tests de integración en `tests/integration/test_dashboard_fees_summary.py` verificando: tarjetas sin compras o inactivas reportan `maintenance_fee = 0`; tarjetas activas prorratean mantención deterministamente entre personas con cuotas activas (incluyendo participantes con `is_active=False`); desglose en `by_card` y `by_person`; invariante de cuadratura estricta `totals_by_currency == sum(by_card.total_due) == sum(by_person.totals_by_currency)` en CLP y USD; y preservación intacta de `active_installments` conteniendo solo cuotas de compras (rojo).
    2. Se implementa la lógica de cálculo y reparto en `DashboardService.get_monthly_summary` (verde).
    3. `pytest tests/integration/test_dashboard_fees_summary.py tests/integration/test_dashboard_api.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T9 — Integración de Mantención en Proyecciones Multi-Mes (`DashboardService.get_projection`)**
  - **RF cubiertos:** `RF-10`.
  - **Archivos:** `app/services/dashboard_service.py`, `tests/integration/test_dashboard_fees_projection.py`.
  - **Hecho cuando:**
    1. Se escriben tests de integración en `tests/integration/test_dashboard_fees_projection.py` verificando que cada mes proyectado aplica su mantención correspondiente (override o default) mientras haya cuotas vigentes, y cuando una tarjeta extingue todas sus cuotas en un mes futuro, la mantención proyectada pasa estrictamente a `$0` (rojo).
    2. Se actualiza `DashboardService.get_projection` (verde).
    3. `pytest tests/integration/test_dashboard_fees_projection.py`, `ruff check .` y `mypy app` pasan al 100%.

- [x] **T10 — Validación E2E, Regresiones y Chequeos de Calidad**
  - **RF cubiertos:** `RF-01` a `RF-10`.
  - **Archivos:** suite de tests completa (`tests/`), `docs/`, `openapi.json`.
  - **Hecho cuando:**
    1. Toda la suite de tests existente y nueva (`pytest`) pasa al 100% sin regresiones.
    2. `ruff check .` pasa sin advertencias ni errores de formato.
    3. `mypy app` pasa sin errores de tipado estricto.
    4. El esquema OpenAPI (`openapi.json`) refleja todos los nuevos endpoints y campos actualizados.
