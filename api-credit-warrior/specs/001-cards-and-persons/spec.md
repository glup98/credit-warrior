# Especificación 001: Gestión de Tarjetas de Crédito (`Card`) y Personas (`Person`)

- **Estado:** Aprobada
- **Fecha:** 2026-10-16
- **Módulo:** `cards` & `persons` (`/api/v1/cards`, `/api/v1/persons`)

---

## 1. Resumen (QUÉ y POR QUÉ)

Para poder registrar compras compartidas, calcular ciclos de facturación y dividir gastos (*splits*), el sistema necesita administrar dos catálogos maestros fundamentales:
1. **Tarjetas de Crédito (`Card`):** Define la moneda de facturación (`CLP` o `USD`), el día de corte (`closing_day`), el día de vencimiento (`due_day`) y los últimos 4 dígitos opcionales como identificador seguro (sin almacenar nunca el PAN completo).
2. **Personas (`Person`):** Entidades maestras o etiquetas (ej. `"Anyi"`, `"Augusto"`) a quienes se les asignan porcentajes o montos de cada gasto, sin requerir un sistema de autenticación en el MVP.

---

## 2. Requisitos Funcionales (Sintaxis EARS)

### 2.1 Gestión de Tarjetas (`Card`)

- **RF-01 (Creación de Tarjeta — Event-Driven):**
  CUANDO un cliente envía una petición `POST /api/v1/cards` con un `name` válido (1–100 caracteres tras `strip()`), `currency` (`CLP` o `USD`), `closing_day` (1–31), `due_day` (1–31) y opcionalmente `last_four_digits` (`^\d{4}$`) e `is_active` (`bool`), el sistema DEBE persistir la tarjeta con un `id` UUID único y responder con código `201 Created` y los datos de la tarjeta creada.

- **RF-02 (Validación de Datos de Tarjeta y Protección PII — Unwanted Behavior):**
  SI una petición de creación o actualización de tarjeta contiene un `closing_day` o `due_day` fuera del rango `1..31`, una moneda distinta de `CLP` o `USD`, un `last_four_digits` que no contenga exactamente 4 dígitos numéricos, un `name` vacío tras `strip()`, o campos adicionales no permitidos (`extra="forbid"`), ENTONCES el sistema DEBE rechazar la petición con código `422 Unprocessable Entity` sin persistir cambios.

- **RF-03 (Listado y Filtrado de Tarjetas — Event-Driven / Optional):**
  CUANDO un cliente envía una petición `GET /api/v1/cards`, el sistema DEBE devolver con código `200 OK` la lista de tarjetas ordenadas alfabéticamente por `name`. DONDE se especifiquen los parámetros de consulta opcionales `is_active` (`true`/`false`) o `currency` (`CLP`/`USD`), el sistema DEBE filtrar los resultados según dichos criterios.

- **RF-04 (Consulta de Tarjeta por ID — Event-Driven / Unwanted Behavior):**
  CUANDO un cliente envía una petición `GET /api/v1/cards/{card_id}`, el sistema DEBE devolver la tarjeta correspondiente con código `200 OK`. SI el `card_id` no existe, ENTONCES el sistema DEBE responder con código `404 Not Found`.

- **RF-05 (Actualización Parcial de Tarjeta — Event-Driven):**
  CUANDO un cliente envía una petición `PATCH /api/v1/cards/{card_id}` con un subconjunto válido de campos (`name`, `last_four_digits`, `currency`, `closing_day`, `due_day`, `is_active`), el sistema DEBE actualizar únicamente los campos enviados, refrescar `updated_at` y responder con código `200 OK`. SI el `card_id` no existe, ENTONCES el sistema DEBE responder con código `404 Not Found`.

- **RF-06 (Eliminación de Tarjeta — Event-Driven):**
  CUANDO un cliente envía una petición `DELETE /api/v1/cards/{card_id}` para una tarjeta existente sin compras asociadas, el sistema DEBE eliminar el registro y responder con código `204 No Content`. SI el `card_id` no existe, ENTONCES el sistema DEBE responder con código `404 Not Found`.

---

### 2.2 Gestión de Personas (`Person`)

- **RF-07 (Creación de Persona — Event-Driven):**
  CUANDO un cliente envía una petición `POST /api/v1/persons` con un `name` válido (1–100 caracteres tras `strip()`, único de forma *case-insensitive*) y opcionalmente `color_hex` (formato hexadecimal `#RRGGBB`) e `is_active` (`bool`), el sistema DEBE persistir la persona con un `id` UUID único y responder con código `201 Created`.

- **RF-08 (Unicidad Case-Insensitive de Nombre de Persona — Unwanted Behavior):**
  SI un cliente intenta crear (`POST`) o actualizar (`PATCH`) una persona con un `name` que ya pertenece a otra persona registrada (comparación *case-insensitive* tras `strip()`, ej. `"Anyi"` vs `"anyi"`), ENTONCES el sistema DEBE rechazar la operación y responder con código `409 Conflict` detallando que el nombre ya existe.

- **RF-09 (Validación de Formato de Persona — Unwanted Behavior):**
  SI una petición de creación o actualización de persona incluye un `name` vacío, un `color_hex` que no cumpla el patrón `^#[0-9A-Fa-f]{6}$`, o campos no reconocidos (`extra="forbid"`), ENTONCES el sistema DEBE rechazar la petición con código `422 Unprocessable Entity`.

- **RF-10 (Listado y Filtrado de Personas — Event-Driven / Optional):**
  CUANDO un cliente envía una petición `GET /api/v1/persons`, el sistema DEBE devolver con código `200 OK` la lista de personas ordenadas alfabéticamente por `name`. DONDE se incluya el parámetro opcional `is_active`, el sistema DEBE devolver únicamente las personas que coincidan con dicho estado.

- **RF-11 (Consulta, Actualización y Eliminación de Persona por ID — Event-Driven / Unwanted Behavior):**
  CUANDO un cliente consulta (`GET /api/v1/persons/{person_id}`), actualiza (`PATCH /api/v1/persons/{person_id}`) o elimina (`DELETE /api/v1/persons/{person_id}`) una persona existente, el sistema DEBE responder con `200 OK` (para `GET`/`PATCH`) o `204 No Content` (para `DELETE`). SI el `person_id` no existe en cualquiera de estas operaciones, ENTONCES el sistema DEBE responder con código `404 Not Found`.

---

## 3. Casos Límite (Edge Cases)

1. **Intento de enviar PAN completo en `last_four_digits`:** Ej. `"4532111122223333"` o `"123a"` $\rightarrow$ Rechazado con `422 Unprocessable Entity`.
2. **Días de corte o vencimiento extremos:** `closing_day = 31` y `due_day = 1` son válidos al crear la tarjeta (el ajuste a meses de 28/29/30 días ocurre en el motor de facturación). Valores como `0` o `32` son rechazados con `422`.
3. **Espacios en blanco (`whitespace`) en nombres:** Si se envía `name: "   "` (solo espacios), debe ser recortado (`strip`) y rechazado con `422` por quedar vacío.
4. **Actualización de una persona con su propio nombre actual:** Enviar `PATCH /api/v1/persons/{id}` manteniendo el mismo `name` de esa misma persona NO debe disparar `409 Conflict`.
5. **Integridad Referencial Futura:** Cuando existan compras (`Expense`) o divisiones (`ExpenseSplit`) asociadas a una `Card` o `Person` (`ondelete="RESTRICT"`), intentar eliminarlas físicamente debe devolver `409 Conflict` indicando que el recurso tiene gastos asociados (sugiriendo desactivarlo con `is_active=false`).

---

## 4. Criterios de Aceptación

- [x] Todos los requisitos `RF-01` a `RF-11` y los casos límite cuentan con pruebas automatizadas en `pytest` (100% en verde).
- [x] Ningún endpoint expone errores internos de SQLAlchemy (`SQLAlchemyError`) al cliente.
- [x] Cumplimiento 100% de `ruff check .` y `mypy app`.
