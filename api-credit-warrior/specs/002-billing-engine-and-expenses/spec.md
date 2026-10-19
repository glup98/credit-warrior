# Especificación 002: Motor de Facturación On-the-Fly y Gestión de Compras Maestras (`Expense` & `ExpenseSplit`)

- **Estado:** Aprobada
- **Fecha:** 2026-10-16
- **Módulo:** `billing_engine` & `expenses` (`/api/v1/expenses`)

---

## 1. Resumen (QUÉ y POR QUÉ)

El corazón financiero de **Credit Warrior** consiste en registrar cada compra con tarjeta de crédito una única vez como **Registro Maestro (`Expense`)** junto con su regla de reparto entre personas (**`ExpenseSplit`**), calculando **al vuelo (*on-the-fly*)** en qué ciclo de facturación recae cada cuota, cuál es el monto exacto de la cuota $k$ de $N$ y cuánto debe pagar cada persona en cada mes sin almacenar $N$ filas redundantes en la base de datos.

---

## 2. Requisitos Funcionales (Sintaxis EARS)

### 2.1 Motor Financiero Puro (`billing_engine`)

- **RF-01 (Determinación del Período de Corte Inicial — Ubiquitous / Event-Driven):**
  CUANDO se evalúa una compra con `purchase_date` en una tarjeta con día de corte `closing_day`, el sistema DEBE determinar el día efectivo de corte del mes de compra como $\min(\text{closing\_day}, \text{días\_del\_mes})$. SI `purchase_date.day <= effective_closing_day`, el primer estado de cuenta ($P_{\text{corte},1}$) DEBE ser el mismo mes de `purchase_date`; SI `purchase_date.day > effective_closing_day`, el primer estado de cuenta DEBE ser el mes calendario siguiente.

- **RF-02 (Determinación del Período de Pago Inicial y Override — State-Driven / Optional):**
  MIENTRAS `first_billing_override` sea `null`, el sistema DEBE calcular el primer período de pago ($P_{\text{pago},1}$) a partir de $P_{\text{corte},1}$: SI `due_day > closing_day`, $P_{\text{pago},1} = P_{\text{corte},1}$; SI `due_day <= closing_day`, $P_{\text{pago},1}$ DEBE ser el mes calendario siguiente a $P_{\text{corte},1}$. DONDE `first_billing_override` esté definido (`"YYYY-MM"`), el sistema DEBE usar dicho período directamente como $P_{\text{pago},1}$.

- **RF-03 (Cálculo On-the-Fly de Vigencia y Monto Exacto de Cuota — Ubiquitous):**
  El sistema DEBE calcular el índice de cuota para cualquier período objetivo $P_t = (Y_t, M_t)$ como $k = (Y_t - Y_1) \times 12 + (M_t - M_1) + 1$, considerando activa la compra sí y solo si $1 \le k \le N$. El monto de cada cuota DEBE calcularse con `Decimal` usando unidad mínima `1` para `CLP` y `0.01` para `USD`, truncando hacia abajo (`ROUND_FLOOR`) la división base y asignando el residuo exacto (`remainder`) a la **cuota #1 (`k = 1`)**, garantizando que $\sum_{k=1}^{N} \text{installment\_amount}(k) \equiv \text{total\_amount}$.

- **RF-04 (Prorrateo Exacto de Cuota por Persona según Splits — Ubiquitous):**
  Para cada cuota $k$, el sistema DEBE prorratear `installment_amount(k)` entre los participantes de `ExpenseSplit` según su modalidad (`EQUAL` con peso $1/M$, `PERCENTAGE` con peso $\text{percentage}/100$, o `FIXED_AMOUNT` con peso $\text{fixed\_amount}/\text{total\_amount}$), redondeando con `ROUND_HALF_UP` para los primeros $M-1$ participantes y asignando la diferencia restante al último participante $M$, garantizando que la suma de las partes por persona sea exactamente igual a `installment_amount(k)`.

---

### 2.2 Gestión de Compras Maestras y Splits (`/api/v1/expenses`)

- **RF-05 (Creación Atómica de Compra y Splits — Event-Driven):**
  CUANDO un cliente envía `POST /api/v1/expenses` con `card_id`, `description`, `total_amount` (`> 0`), `purchase_date`, `installments_count` (`1..120`), opcionalmente `first_billing_override` (`YYYY-MM`) y `notes`, junto con una lista no vacía de `splits`, el sistema DEBE persistir el registro maestro `Expense` y sus `ExpenseSplit` en una única transacción y responder con `201 Created`.

- **RF-06 (Validación de Invariantes de Compra y Splits — Unwanted Behavior):**
  SI el payload de creación o actualización de un gasto contiene:
  1. `total_amount <= 0` o `installments_count` fuera de `1..120`,
  2. Lista `splits` vacía o con `person_id` repetidos dentro del mismo gasto,
  3. Mezcla de distintos `split_type` en el mismo gasto,
  4. `split_type == "PERCENTAGE"` cuya suma de porcentajes sea distinta de `100.00`,
  5. `split_type == "FIXED_AMOUNT"` cuya suma de `fixed_amount` sea distinta de `total_amount`,
  6. Campos no permitidos (`extra="forbid"`),
  ENTONCES el sistema DEBE rechazar la petición con `422 Unprocessable Entity`. SI el `card_id` o algún `person_id` no existe en la base de datos, ENTONCES el sistema DEBE responder con `404 Not Found`.

- **RF-07 (Listado y Filtrado de Compras, incluyendo Vigencia On-the-Fly — Event-Driven / Optional):**
  CUANDO un cliente envía `GET /api/v1/expenses`, el sistema DEBE devolver las compras ordenadas por `purchase_date` descendente. DONDE se especifiquen los filtros opcionales `card_id`, `person_id`, `date_from`, `date_to` o `active_in_period=YYYY-MM`, el sistema DEBE devolver únicamente las compras que cumplan todos los filtros indicados (evaluando al vuelo $1 \le k \le N$ para `active_in_period`).

- **RF-08 (Consulta, Actualización Atómica y Eliminación de Compra — Event-Driven / Unwanted Behavior):**
  CUANDO un cliente consulta (`GET /api/v1/expenses/{expense_id}`), actualiza (`PUT /api/v1/expenses/{expense_id}`) o elimina (`DELETE /api/v1/expenses/{expense_id}`) una compra existente, el sistema DEBE devolver `200 OK` (para `GET`/`PUT`, reemplazando atómicamente los `splits` en `PUT`) o `204 No Content` (para `DELETE`, borrando sus `splits` en cascada). SI el `expense_id` no existe, el sistema DEBE responder con `404 Not Found`.

- **RF-09 (Tabla de Amortización al Vuelo `/schedule` — Event-Driven):**
  CUANDO un cliente envía `GET /api/v1/expenses/{expense_id}/schedule`, el sistema DEBE calcular al vuelo y devolver con código `200 OK` el cronograma completo de las $N$ cuotas (`1/N` a `N/N`), incluyendo para cada cuota: `statement_period`, `payment_period`, `closing_date`, `due_date`, `installment_amount` y el desglose `person_shares` por participante.

- **RF-10 (Protección de Integridad Referencial en `Card` y `Person` — Unwanted Behavior):**
  SI un cliente intenta eliminar (`DELETE /api/v1/cards/{card_id}` o `DELETE /api/v1/persons/{person_id}`) una tarjeta o persona que tiene compras o *splits* asociados, ENTONCES el sistema DEBE impedir el borrado y responder con código `409 Conflict` indicando que existen gastos asociados.

---

## 3. Casos Límite (Edge Cases)

1. **Compras indivisibles en CLP (ej. `$100.000` en `3` cuotas):**
   - Cuota base = `$33.333`, residuo = `$1`.
   - Cuota 1 (`1/3`) = `$33.334`; Cuota 2 (`2/3`) = `$33.333`; Cuota 3 (`3/3`) = `$33.333`. Suma = `$100.000`.
2. **Split 50/50 sobre una cuota impar en CLP (ej. Cuota de `$33.333` entre Anyi y Augusto en modo `EQUAL`):**
   - Participante 1 (`ROUND_HALF_UP` de `16666.5`) = `$16.667`; Participante 2 (`33333 - 16667`) = `$16.666`. Suma = `$33.333`.
3. **Meses cortos y años bisiestos (`closing_day = 31` en febrero):**
   - En febrero de 2026 (no bisiesto), `effective_closing_day` es `2026-02-28`. En febrero de 2028 (bisiesto), es `2028-02-29`.
4. **Cruce de año (diciembre $\rightarrow$ enero):**
   - Compra realizada el `2026-12-26` en tarjeta con `closing_day = 25` y `due_day = 10`: cierra en `2027-01` y su primera cuota vence en `2027-02`.

---

## 4. Criterios de Aceptación

- [x] Funciones de `app/services/billing_engine.py` 100% puras, sin acceso a base de datos ni llamadas a `date.today()`.
- [x] Todos los requisitos `RF-01` a `RF-10` y los casos límite están cubiertos por tests unitarios e integración en `pytest` (100% en verde).
- [x] Cumplimiento 100% de `ruff check .` y `mypy app`.
