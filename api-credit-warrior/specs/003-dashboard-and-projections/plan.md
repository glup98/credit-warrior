# Plan Técnico 003: Dashboard de Resumen Mensual y Proyecciones Multi-Mes

- **Spec de referencia:** [`specs/003-dashboard-and-projections/spec.md`](./spec.md)
- **Estado:** Borrador para aprobación

---

## 1. Arquitectura y Archivos a Crear / Modificar

| Capa | Archivo | Acción | Responsabilidad | RF Cubiertos |
| :--- | :--- | :--- | :--- | :--- |
| **Services (Pure Domain)** | `app/services/billing_engine.py` | Modificar | Añadir función pura `compute_default_next_period(reference_date: date) -> YearMonth`. | `RF-01` |
| **Schemas (DTO)** | `app/schemas/dashboard.py`, `app/schemas/__init__.py` | Crear / Modificar | DTOs `CardPersonBreakdown`, `CardMonthlySummary`, `PersonMonthlySummary`, `ActiveInstallmentShare`, `ActiveInstallmentItem`, `DashboardSummaryResponse`, `DashboardProjectionResponse`. | `RF-02`, `RF-03` |
| **Services** | `app/services/dashboard_service.py` | Crear | `DashboardService.get_monthly_summary(period, reference_date)` y `get_projection(start_period, months, reference_date)`. | `RF-01`–`RF-04` |
| **API v1** | `app/api/v1/endpoints/dashboard.py`, `app/api/v1/router.py` | Crear / Modificar | Endpoints `GET /api/v1/dashboard/summary` y `GET /api/v1/dashboard/projection` con validación `Query(ge=1, le=24)` para `months`. | `RF-01`–`RF-04` |
| **Tests** | `tests/unit/test_billing_engine.py`, `tests/integration/test_dashboard_api.py` | Modificar / Crear | Tests unitarios de `compute_default_next_period` y suite de integración multi-moneda (`CLP` y `USD`), invariante de cuadratura y proyección multi-mes. | `RF-01`–`RF-04` |

---

## 2. Decisiones Técnicas y Alternativas Descartadas

1. **Inyección de `reference_date: date` desde la Capa HTTP hacia el Dominio:**
   - *Decisión:* `compute_default_next_period(reference_date: date)` en `billing_engine.py` exige `reference_date: date` sin valor por defecto, manteniendo el motor 100% puro. En el endpoint HTTP (`app/api/v1/endpoints/dashboard.py`), una dependencia inyectable (`get_reference_date`) suministra la fecha actual cuando el cliente no envía `period`, permitiendo además que los tests de integración fijen `reference_date` determinísticamente mediante `dependency_overrides`.
   - *Alternativa descartada:* Llamar a `date.today()` dentro de `billing_engine.py` o `DashboardService`, lo que violaría la regla 4.3 de `AGENTS.md` y haría que los tests dependieran del reloj del sistema.
2. **Separación Estricta de Monedas (`CLP` vs `USD`) en `totals_by_currency`:**
   - *Decisión:* Inicializar siempre los diccionarios de moneda con `CurrencyEnum.CLP: Decimal("0")` y `CurrencyEnum.USD: Decimal("0.00")` para garantizar respuestas predecibles incluso en meses sin actividad.
   - *Alternativa descartada:* Omitir claves de moneda cuando el total es cero, lo que obligaría al frontend a lidiar con claves ausentes.

---

## 3. Verification Plan

### Estrategia de Tests (`pytest`)
- **Tests Unitarios (`tests/unit/test_billing_engine.py`):**
  - Verificar `compute_default_next_period(date(2026, 10, 16)) == YearMonth(2026, 11)` y cruce de año `compute_default_next_period(date(2026, 12, 31)) == YearMonth(2027, 1)` (`RF-01`).
- **Tests de Integración (`tests/integration/test_dashboard_api.py`):**
  - Período vacío sin compras devuelve totales en `0` y listas vacías (`RF-01`, `RF-02`).
  -Escenario mixto (`CLP` y `USD`, múltiples tarjetas y personas con splits 50/50 y porcentuales): verificar que `totals_by_currency`, `by_card`, `by_person` y `active_installments` cuadren exactamente al centavo/peso (`RF-02`).
  - Proyección multi-mes (`/api/v1/dashboard/projection?start_period=2026-11&months=4`) verificando cómo disminuyen los totales a medida que terminan las cuotas (`RF-03`).
  - Validación de errores `400`/`422` ante `period` mal formado o `months` fuera de `1..24` (`RF-04`).

### Automated Security Check
- **Security Scanner**: Run a scan on all newly created files to identify common vulnerabilities (e.g., XSS, SQL injection). If findings are detected, auto-apply the fix and document the results.
- **Security Audit**: Audit the new code for design-level security issues (input validation, secrets handling, auth checks). Document findings and remediations in the `walkthrough.md` artifact using the `generate_security_audit_report` skill.
