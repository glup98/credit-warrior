# Tareas 003: Dashboard de Resumen Mensual y Proyecciones Multi-Mes

- **Spec:** [`specs/003-dashboard-and-projections/spec.md`](./spec.md)
- **Plan:** [`specs/003-dashboard-and-projections/plan.md`](./plan.md)

---

## Lista de Tareas (Orden de Ejecución TDD)

- [x] **T1 — Función Pura `compute_default_next_period` y Esquemas Pydantic del Dashboard (`app/schemas/dashboard.py`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`.
  - **Archivos:** `app/services/billing_engine.py`, `app/schemas/dashboard.py`, `app/schemas/__init__.py`, `tests/unit/test_billing_engine.py`.
  - **Hecho cuando:** Los tests unitarios de `compute_default_next_period(reference_date)` y la validación de esquemas en `app/schemas/dashboard.py` pasan al 100% en `pytest`, `ruff` y `mypy`.

- [x] **T2 — Servicio `DashboardService` y Endpoints REST (`/api/v1/dashboard/summary` y `/api/v1/dashboard/projection`)**
  - **RF cubiertos:** `RF-01`, `RF-02`, `RF-03`, `RF-04`.
  - **Archivos:** `app/services/dashboard_service.py`, `app/api/v1/endpoints/dashboard.py`, `app/api/v1/router.py`, `tests/integration/test_dashboard_api.py`.
  - **Hecho cuando:** Todos los tests de integración del dashboard (período por defecto, cuadratura exacta multi-moneda `CLP`/`USD` por tarjeta y persona, extinción de cuotas en `/projection` y validación `400`/`422`) pasan al 100% en `pytest`, `ruff` y `mypy`.
