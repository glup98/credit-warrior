# Contexto del Backend (api-credit-warrior) para el Diseño del Frontend

## 1. Qué hace el Backend (Reglas de Negocio Centrales)

1. **El Backend concentra el 100% de la lógica financiera:** El frontend no debe calcular fechas de corte, vencimientos, cuotas, mantenciones ni divisiones de centavos/pesos; solo consume y renderiza lo que devuelve la API.
2. **Sin Autenticación en el MVP:** No existe login ni cabeceras `Authorization` por ahora. Los participantes de gastos son entidades maestras llamadas `Person` (ej. "Anyi", "Augusto").
3. **Montos como string (Decimal):** En las respuestas JSON (y en los envíos), todos los valores monetarios (`total_amount`, `installment_amount`, `purchases_total`, `maintenance_fee`, `total_due`, `purchases_amount`, `fee_share`, `amount_due`, `percentage`, `fixed_amount`) viajan como strings numéricos (ej. `"100000"` para CLP sin decimales, `"33.34"` para USD con 2 decimales) para evitar pérdida de precisión en JavaScript.
4. **Cálculo de Cuotas "Al Vuelo" (On-the-Fly):** Cuando el frontend registra una compra (`Expense`) en $N$ cuotas, se guarda un único registro maestro. El backend calcula dinámicamente en qué estado de cuenta cae cada cuota según el `closing_day` y `due_day` de la tarjeta, y absorbe cualquier residuo de redondeo en la cuota #1 (1/N) y en el último participante del split.
5. **Costos de Mantención Mensual y Reparto Dinámico:**
   - Cada tarjeta puede tener un costo de mantención mensual por defecto (`default_monthly_fee`).
   - Se puede fijar o sobreescribir la tarifa mes a mes para períodos específicos (`PUT /api/v1/cards/{card_id}/fees/{period}`).
   - **Regla de Inactividad:** Si en un mes de pago (`YYYY-MM`) una tarjeta no tiene cuotas de compras activas a pagar (`purchases_total == 0`), la comisión de mantención **no se cobra ($0)** y no aparece con costo ni suma al total del mes.
   - **Reparto entre participantes activos:** Si la tarjeta tuvo compras en el mes:
     - Si solo 1 persona participó en compras de esa tarjeta, asume el 100% de la mantención.
     - Si $M$ personas distintas participaron en compras de esa tarjeta, la mantención se divide en partes iguales ($1/M$), absorbiendo el residuo en la última persona ordenada por UUID ascendente.
6. **Validación Estricta (`extra="forbid"`):** Todos los payloads POST, PUT y PATCH rechazan con `422 Unprocessable Entity` cualquier propiedad extra que no pertenezca al esquema.

---

## 2. Configuración de Red, CORS y Manejo de Errores

- **Base URL Local:** `http://127.0.0.1:8000`
- **Prefijo API:** `/api/v1` (más `GET /health` en la raíz)
- **Documentación Interactiva:** `http://127.0.0.1:8000/docs` (Swagger UI) y `http://127.0.0.1:8000/redoc` (ReDoc)
- **Orígenes CORS permitidos por defecto:** `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`
- **Formato estándar de errores HTTP:**
  - `400 Bad Request` / `404 Not Found` / `409 Conflict`:
    ```json
    { "detail": "Mensaje descriptivo del error de dominio" }
    ```
  - `422 Unprocessable Entity` (errores de validación Pydantic V2):
    ```json
    { "detail": [ { "loc": ["body", "campo"], "msg": "...", "type": "..." } ] }
    ```

---

## 3. Contratos de Endpoints (`/api/v1`)

### 3.1 Tarjetas de Crédito (`/api/v1/cards`)

| Método | Ruta | Query Params | Respuesta | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cards` | `is_active?: bool`, `currency?: "CLP" \| "USD"` | `200 OK` (`CardRead[]`) | Lista tarjetas ordenadas alfabéticamente por `name`. |
| `POST` | `/api/v1/cards` | — | `201 Created` (`CardRead`) | Crea una tarjeta de crédito. |
| `GET` | `/api/v1/cards/{card_id}` | — | `200 OK` (`CardRead`) / `404` | Obtiene una tarjeta por UUID. |
| `PATCH` | `/api/v1/cards/{card_id}` | — | `200 OK` (`CardRead`) / `404` | Actualización parcial de campos enviados. |
| `DELETE` | `/api/v1/cards/{card_id}` | — | `204 No Content` / `404` / `409` | Elimina la tarjeta. Devuelve 409 si tiene compras asociadas. |

#### Payload `POST /api/v1/cards` (`CardCreate`):
```json
{
  "name": "Visa Santander",
  "last_four_digits": "1234",
  "currency": "CLP",
  "closing_day": 25,
  "due_day": 10,
  "default_monthly_fee": "4500",
  "is_active": true
}
```
*(Nota: `default_monthly_fee` es opcional, por defecto `"0"`. `last_four_digits` es opcional string nullable cumpliendo `^\d{4}$`. `closing_day` y `due_day` son enteros de 1 a 31).*

#### Payload `PATCH /api/v1/cards/{card_id}` (`CardUpdate`):
Todos los campos son opcionales (`name`, `last_four_digits`, `currency`, `closing_day`, `due_day`, `default_monthly_fee`, `is_active`).

#### Response (`CardRead`):
```json
{
  "id": "8f14e45f-ceea-467a-9a18-4b78c2d81e11",
  "name": "Visa Santander",
  "last_four_digits": "1234",
  "currency": "CLP",
  "closing_day": 25,
  "due_day": 10,
  "default_monthly_fee": "4500",
  "is_active": true,
  "created_at": "2026-10-16T15:00:00Z",
  "updated_at": "2026-10-22T15:00:00Z"
}
```

---

### 3.2 Tarifas de Mantención Mensual de Tarjeta (`/api/v1/cards/{card_id}/fees`)

| Método | Ruta | Query Params | Respuesta | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `PUT` | `/api/v1/cards/{card_id}/fees/{period}` | — | `200 OK` (`CardMonthlyFeeResponse`) / `404` / `422` | Registra o actualiza la sobreescritura de mantención para el mes `YYYY-MM`. |
| `GET` | `/api/v1/cards/{card_id}/fees` | — | `200 OK` (`CardMonthlyFeeResponse[]`) / `404` | Lista las sobreescrituras registradas ordenadas cronológicamente. |
| `GET` | `/api/v1/cards/{card_id}/fees/{period}` | — | `200 OK` (`CardMonthlyFeeResponse`) / `404` / `422` | Consulta la tarifa efectiva del mes indicando si es `OVERRIDE` o `CARD_DEFAULT`. |
| `DELETE` | `/api/v1/cards/{card_id}/fees/{period}` | — | `204 No Content` / `404` | Elimina la sobreescritura de ese mes, restaurando el cobro base por defecto. |

#### Payload `PUT /api/v1/cards/{card_id}/fees/{period}` (`CardMonthlyFeeCreateOrUpdate`):
```json
{
  "fee": "5200"
}
```

#### Response (`CardMonthlyFeeResponse`):
```json
{
  "card_id": "8f14e45f-ceea-467a-9a18-4b78c2d81e11",
  "period": "2026-11",
  "fee": "5200",
  "source": "OVERRIDE"
}
```
*(Nota: `source` puede ser `"OVERRIDE"` o `"CARD_DEFAULT"`).*

---

### 3.3 Personas / Participantes (`/api/v1/persons`)

| Método | Ruta | Query Params | Respuesta | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/persons` | `is_active?: bool` | `200 OK` (`PersonRead[]`) | Lista personas ordenadas alfabéticamente por `name`. |
| `POST` | `/api/v1/persons` | — | `201 Created` / `409 Conflict` | Crea una persona. `name` es único (case-insensitive). |
| `GET` | `/api/v1/persons/{person_id}` | — | `200 OK` (`PersonRead`) / `404` | Obtiene una persona por UUID. |
| `PATCH` | `/api/v1/persons/{person_id}` | — | `200 OK` / `404` / `409` | Actualización parcial (`name`, `color_hex`, `is_active`). |
| `DELETE` | `/api/v1/persons/{person_id}` | — | `204 No Content` / `404` / `409` | Elimina la persona (409 si participa en compras). |

#### Payload `POST /api/v1/persons` (`PersonCreate`):
```json
{
  "name": "Anyi",
  "color_hex": "#FF5733",
  "is_active": true
}
```

---

### 3.4 Compras Maestras y Splits (`/api/v1/expenses`)

| Método | Ruta | Query Params | Respuesta | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/expenses` | `card_id?: UUID`, `person_id?: UUID`, `date_from?: YYYY-MM-DD`, `date_to?: YYYY-MM-DD`, `active_in_period?: YYYY-MM` | `200 OK` (`ExpenseRead[]`) | Lista compras ordenadas por fecha descendente. `active_in_period` filtra al vuelo las que tienen cuota activa en ese mes. |
| `POST` | `/api/v1/expenses` | — | `201 Created` / `404` / `422` | Crea la compra y sus splits en una sola transacción. |
| `GET` | `/api/v1/expenses/{expense_id}` | — | `200 OK` (`ExpenseRead`) / `404` | Detalle de la compra maestra y sus splits. |
| `PUT` | `/api/v1/expenses/{expense_id}` | — | `200 OK` (`ExpenseRead`) / `404` / `422` | Actualiza la compra y reemplaza atómicamente sus splits. |
| `DELETE` | `/api/v1/expenses/{expense_id}` | — | `204 No Content` / `404` | Elimina la compra y sus splits en cascada. |
| `GET` | `/api/v1/expenses/{expense_id}/schedule` | — | `200 OK` (`ExpenseScheduleResponse`) / `404` | **Tabla de Amortización:** Cronograma mes a mes de las $N$ cuotas con montos por persona. |

#### Reglas de splits al crear/editar (`ExpenseCreate` / `ExpenseUpdate`):
Todos los splits de una compra deben usar el mismo `split_type`:
1. `"EQUAL"`: No se envía `percentage` ni `fixed_amount` (se divide en partes iguales).
2. `"PERCENTAGE"`: Cada split lleva `"percentage": "70.00"` y la suma debe ser exactamente `100.00`.
3. `"FIXED_AMOUNT"`: Cada split lleva `"fixed_amount": "200000"` y la suma debe ser exactamente igual a `total_amount`.

#### Payload `POST /api/v1/expenses`:
```json
{
  "card_id": "8f14e45f-ceea-467a-9a18-4b78c2d81e11",
  "description": "Refrigerador",
  "total_amount": "100000",
  "purchase_date": "2026-10-16",
  "installments_count": 3,
  "first_billing_override": null,
  "notes": "Compra tienda online",
  "splits": [
    { "person_id": "11111111-2222-3333-4444-555555555551", "split_type": "EQUAL" },
    { "person_id": "11111111-2222-3333-4444-555555555552", "split_type": "EQUAL" }
  ]
}
```

---

### 3.5 Dashboard y Proyecciones (`/api/v1/dashboard`)

| Método | Ruta | Query Params | Respuesta | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/summary` | `period?: YYYY-MM` | `200 OK` (`DashboardSummaryResponse`) / `400` / `422` | Resumen completo del mes de pago. Si se omite `period`, calcula por defecto el próximo mes calendario. |
| `GET` | `/api/v1/dashboard/projection` | `start_period?: YYYY-MM`, `months?: int (1..24, default 6)` | `200 OK` (`DashboardProjectionResponse`) / `400` / `422` | Proyección mensual de desendeudamiento para los próximos `months` meses consecutivos. |

#### Response `GET /api/v1/dashboard/summary?period=2026-11` (`DashboardSummaryResponse`):
```json
{
  "period": "2026-11",
  "totals_by_currency": {
    "CLP": "54500",
    "USD": "30.00"
  },
  "by_card": [
    {
      "card_id": "8f14e45f-ceea-467a-9a18-4b78c2d81e11",
      "card_name": "Visa Santander",
      "currency": "CLP",
      "closing_date": "2026-10-25",
      "due_date": "2026-11-10",
      "purchases_total": "50000",
      "maintenance_fee": "4500",
      "total_due": "54500",
      "by_person": [
        {
          "person_id": "11111111-2222-3333-4444-555555555551",
          "person_name": "Anyi",
          "purchases_amount": "25000",
          "fee_share": "2250",
          "amount_due": "27250"
        },
        {
          "person_id": "11111111-2222-3333-4444-555555555552",
          "person_name": "Augusto",
          "purchases_amount": "25000",
          "fee_share": "2250",
          "amount_due": "27250"
        }
      ]
    }
  ],
  "by_person": [
    {
      "person_id": "11111111-2222-3333-4444-555555555551",
      "person_name": "Anyi",
      "totals_by_currency": { "CLP": "27250", "USD": "21.00" }
    },
    {
      "person_id": "11111111-2222-3333-4444-555555555552",
      "person_name": "Augusto",
      "totals_by_currency": { "CLP": "27250", "USD": "9.00" }
    }
  ],
  "active_installments": [
    {
      "expense_id": "9a8b7c6d-1234-5678-9abc-def012345678",
      "description": "Refrigerador",
      "card_id": "8f14e45f-ceea-467a-9a18-4b78c2d81e11",
      "card_name": "Visa Santander",
      "currency": "CLP",
      "purchase_date": "2026-10-15",
      "installment_number": 1,
      "installments_count": 2,
      "installment_label": "1/2",
      "installment_amount": "50000",
      "person_shares": [
        { "person_id": "11111111-2222-3333-4444-555555555551", "person_name": "Anyi", "amount": "25000" },
        { "person_id": "11111111-2222-3333-4444-555555555552", "person_name": "Augusto", "amount": "25000" }
      ]
    }
  ]
}
```

> **Invariante de Cuadratura Financiera:**
> Para cada moneda (`CLP`, `USD`), se cumple siempre con precisión matemática estricta:
> $$\text{totals\_by\_currency} \equiv \sum \text{by\_card.total\_due} \equiv \sum \text{by\_person.totals\_by\_currency}$$

---

## 4. Vistas Sugeridas para el Frontend

1. **Vista Principal — Dashboard Mensual y Proyección:**
   - **Selector de período:** `YYYY-MM` (por defecto `GET /api/v1/dashboard/summary` sin parámetros muestra el mes entrante).
   - **KPIs superiores:** `totals_by_currency.CLP` y `totals_by_currency.USD` (monto total a pagar ese mes).
   - **Tarjetas de crédito (`by_card`):**
     - Muestra fechas de corte (`closing_date`) y vencimiento (`due_date`).
     - Subtotal de compras (`purchases_total`), mantención cobrada (`maintenance_fee`) y total de la tarjeta (`total_due`).
     - Desglose por persona: lo que le corresponde pagar a cada uno en esa tarjeta (`amount_due` = `purchases_amount` + `fee_share`).
   - **Resumen por Persona (`by_person`):**
     - Cuánto debe aportar cada persona en total en el mes, desglosado por moneda (`CLP` y `USD`), sumando sus compras y sus aportes de mantención.
   - **Cuotas activas del mes (`active_installments`):**
     - Lista detallada con badge `k/N` (ej. `"1/3"`), cuota del mes y cuánto paga cada persona.
   - **Gráfico de desendeudamiento a futuro:**
     - Consumir `GET /api/v1/dashboard/projection?months=6` (o 12) para graficar barras apiladas con la evolución de la deuda mensual.
2. **Vista de Compras (Expenses):**
   - Formulario de nueva compra cargando tarjetas (`GET /api/v1/cards?is_active=true`) y personas (`GET /api/v1/persons?is_active=true`), con selector de modo de división (Partes Iguales, Porcentaje % o Monto Fijo $).
   - Al hacer clic en una compra, abrir un Drawer/Modal que consuma `GET /api/v1/expenses/{id}/schedule` para mostrar la tabla de amortización cuota a cuota.
3. **Vista de Configuración de Tarjetas y Personas:**
   - **Tarjetas:** Gestión de nombre, últimos 4 dígitos, moneda, días de corte/vencimiento y mantención base (`default_monthly_fee`).
   - **Mantenciones mensuales:** Opción para ver y sobreescribir la tarifa de un mes puntual mediante `PUT /api/v1/cards/{card_id}/fees/{period}` o eliminar la sobreescritura (`DELETE`).
   - **Personas:** Creación y edición de nombres y colores (`color_hex`).
