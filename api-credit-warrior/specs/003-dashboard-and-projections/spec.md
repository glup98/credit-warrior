# Especificación 003: Dashboard de Resumen Mensual y Proyecciones Multi-Mes

- **Estado:** Aprobada
- **Fecha:** 2026-10-16
- **Módulo:** `dashboard` (`/api/v1/dashboard/summary`, `/api/v1/dashboard/projection`)

---

## 1. Resumen (QUÉ y POR QUÉ)

El objetivo principal del backend de **Credit Warrior** es alimentar un dashboard que responda de forma inmediata y exacta: *"¿Cuánto hay que pagar el próximo mes en total, cuánto vence en cada tarjeta y cuánto le corresponde aportar a cada persona?"*, así como proyectar la evolución de la deuda durante los próximos $M$ meses considerando las cuotas vigentes y los ciclos de facturación de cada tarjeta.

---

## 2. Requisitos Funcionales (Sintaxis EARS)

- **RF-01 (Resumen de Pago Mensual y Período por Defecto — Event-Driven / Optional):**
  CUANDO un cliente envía `GET /api/v1/dashboard/summary`, el sistema DEBE calcular el resumen de pagos para el período `period` (`YYYY-MM`) indicado en la consulta. DONDE el parámetro `period` se omita, el sistema DEBE proyectar por defecto el **próximo mes calendario** respecto a la fecha de referencia (`reference_date + 1 month`).

- **RF-02 (Agregaciones del Resumen e Invariante de Cuadratura — Ubiquitous):**
  Para el período consultado, el sistema DEBE devolver con código `200 OK`:
  1. `totals_by_currency`: Monto total a pagar agrupado por moneda (`CLP` y `USD`).
  2. `by_card`: Lista de tarjetas con cuotas activas en el período, incluyendo `closing_date` efectiva del estado de cuenta, `due_date` efectiva de pago, `total_due` de la tarjeta y el desglose `by_person` dentro de esa tarjeta.
  3. `by_person`: Lista de personas con deuda activa en el período y su mapa `totals_by_currency` (`CLP` y `USD`).
  4. `active_installments`: Detalle de cada compra cuya cuota $k$ cumpla $1 \le k \le N$ en el período, indicando `installment_number`, `installments_count`, `installment_label` (`"k/N"`), `installment_amount` y `person_shares`.
  **Invariante:** Para cada moneda (`CLP`, `USD`), la suma de `by_card.total_due`, la suma de `by_person.totals_by_currency` y la suma de `active_installments.installment_amount` DEBEN ser exactamente iguales a `totals_by_currency`.

- **RF-03 (Proyección Multi-Mes de Desendeudamiento — Event-Driven / Optional):**
  CUANDO un cliente envía `GET /api/v1/dashboard/projection` con `start_period` opcional (`YYYY-MM`, por defecto próximo mes calendario) y `months` opcional (entero entre `1` y `24`, por defecto `6`), el sistema DEBE devolver con código `200 OK` una lista ordenada de `months` resúmenes mensuales consecutivos (`periods`) desde `start_period` hasta `start_period + (months - 1)`.

- **RF-04 (Validación de Parámetros de Consulta — Unwanted Behavior):**
  SI un cliente envía un `period` o `start_period` con formato inválido (distinto de `YYYY-MM` con mes `01..12`) o un parámetro `months` fuera del rango `1..24`, ENTONCES el sistema DEBE rechazar la petición con código `400 Bad Request` o `422 Unprocessable Entity`.

---

## 3. Casos Límite (Edge Cases)

1. **Período sin compras activas:** Si en el mes consultado ninguna compra tiene cuotas vigentes, `totals_by_currency` debe devolver `{"CLP": "0", "USD": "0.00"}` (o `"0"`), y las listas `by_card`, `by_person` y `active_installments` deben devolverse vacías (`[]`) con código `200 OK`.
2. **Coexistencia de compras en `CLP` y `USD`:** Nunca se deben sumar entre sí montos de `CLP` con montos de `USD`; todas las agregaciones globales y por persona mantienen las monedas separadas.
3. **Extinción progresiva de cuotas en `/projection`:** Una compra de 2 cuotas activa en `2026-11` (`1/2`) y `2026-12` (`2/2`) debe desaparecer automáticamente del resumen a partir del tercer mes proyectado (`2027-01`).

---

## 4. Criterios de Aceptación

- [x] `compute_default_next_period(reference_date: date)` es una función pura que recibe `reference_date` explícitamente.
- [x] Todos los requisitos `RF-01` a `RF-04` y los casos límite cuentan con pruebas automatizadas en `pytest` (100% en verde).
- [x] Cumplimiento 100% de `ruff check .` y `mypy app`.
