# Plan Técnico 005 — Historial de Compras, Filtros Reactivos y Cronograma de Amortización (`005-expenses-history-and-schedule`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Especificación Relacionada:** [`specs/005-expenses-history-and-schedule/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/005-expenses-history-and-schedule/spec.md) (v1.1.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§3.5, §4.1, §4.2, §5.1, §5.2), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`docs/resume.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume.md), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura para la Spec 005 modulariza la vista de compras y cronogramas dentro de `src/features/expenses/`, conectando la ruta `src/app/(main)/expenses/page.tsx` con componentes especializados para presentación de tarjetas semánticas, barra reactiva de filtros, panel adaptativo de cronograma, diálogos de edición y eliminación, y utilidades de sanitización para cumplir el contrato `PUT`.

```text
web-credit-warrior/
├── src/
│   ├── app/
│   │   └── (main)/
│   │       └── expenses/
│   │           └── page.tsx                    # Vista principal /expenses con Suspense boundary para searchParams
│   ├── features/
│   │   └── expenses/
│   │       ├── components/
│   │       │   ├── expense-card.tsx            # Ficha de gasto semántica (<article>) con fechas deterministas y accesibilidad DOM
│   │       │   ├── expense-delete-dialog.tsx   # Diálogo destructivo AlertDialog para DELETE /api/v1/expenses/{id}
│   │       │   ├── expense-edit-dialog.tsx     # Formulario adaptativo de edición con protección dismissible={!isDirty}
│   │       │   ├── expense-filters-bar.tsx     # Barra reactiva de filtros (tarjeta, persona, período) y búsqueda en texto
│   │       │   ├── expense-list.tsx            # Contenedor de listado, estados de carga (skeletons) y estados vacíos
│   │       │   └── expense-schedule-drawer.tsx # Panel adaptativo (Drawer/Dialog) con tabla de amortización cuota a cuota
│   │       ├── utils/
│   │       │   └── expense-payload.ts          # Sanitización de splits (descarte id, created_at) y normalización a null para PUT
│   │       └── expenses-view.tsx               # Coordinador de vista, evaluación de búsqueda en memoria y gestión de modales
│   ├── hooks/
│   │   └── queries/
│   │       ├── use-cards.ts                    # useCards() para poblar selector de tarjetas en filtros
│   │       ├── use-expenses.ts                 # useExpenses, useExpenseSchedule, useUpdateExpense, useDeleteExpense
│   │       └── use-persons.ts                  # usePersons() para poblar selector de participantes en filtros
│   ├── lib/
│   │   ├── formatters.ts                       # formatDate, formatPeriod, formatCurrency, formatMaskedCard
│   │   ├── query-keys.ts                       # queryKeys.expenses y queryKeys.dashboard
│   │   └── utils.ts                            # mapPydanticErrorsToForm y cn()
│   └── schemas/
│       └── expense.schema.ts                   # expenseUpdateSchema, decimalStringRegex
```

---

## 2. Contratos de Datos, Mapeo de Endpoints y Estrategia de Caché

### 2.1 Mapeo de Endpoints OpenAPI Consumidos

| Operación | Método y Endpoint | Parámetros / Request Payload | Hook Consumido | Respuesta y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **Listar Compras** | `GET /api/v1/expenses` | `card_id?: UUID`<br>`person_id?: UUID`<br>`active_in_period?: YYYY-MM` | `useExpenses(filters)` | `200 OK (ExpenseRead[])`. Ordenadas por `purchase_date` descendente. |
| **Cronograma Amortización** | `GET /api/v1/expenses/{id}/schedule` | `expense_id: UUID` (en ruta) | `useExpenseSchedule(id)` | `200 OK (ExpenseScheduleResponse)`. Tabla cuota a cuota con fechas y desgloses. |
| **Actualizar Compra** | `PUT /api/v1/expenses/{id}` | `expense_id: UUID`<br>`ExpenseUpdate` (`.strict()`) | `useUpdateExpense()` | `200 OK (ExpenseRead)`. Reemplazo atómico completo del gasto y sus splits. |
| **Eliminar Compra** | `DELETE /api/v1/expenses/{id}` | `expense_id: UUID` (en ruta) | `useDeleteExpense()` | `204 No Content`. Eliminación en cascada del gasto y sus splits. |
| **Catálogo Tarjetas** | `GET /api/v1/cards` | — | `useCards()` | `200 OK (CardRead[])`. Opciones del selector de tarjetas en filtros. |
| **Catálogo Personas** | `GET /api/v1/persons` | — | `usePersons()` | `200 OK (PersonRead[])`. Opciones del selector de participantes en filtros. |

### 2.2 Sincronización en URL Search Params y Mapeo Bidireccional
La coordinación de filtros utiliza los parámetros de búsqueda de la URL para que cualquier vista sea compartible y resistente a recargas:

| Parámetro en URL | Parámetro en Red (API) | Ámbito de Evaluación | Comportamiento en UI |
| :--- | :--- | :--- | :--- |
| `card_id=UUID` | `card_id=UUID` | Servidor (TanStack Query) | Filtra compras de esa tarjeta en la petición HTTP. |
| `person_id=UUID` | `person_id=UUID` | Servidor (TanStack Query) | Filtra compras donde participe esa persona en la petición HTTP. |
| `period=YYYY-MM` | `active_in_period=YYYY-MM` | Servidor (TanStack Query) | **Mapeo explícito**: el valor de `period` en URL se envía como `active_in_period` a la API y se incluye en la Query Key `queryKeys.expenses.list({ active_in_period })`. |
| `q=texto` | *(Ninguno — no se envía)* | **Estrictamente Cliente (Memoria)** | Sincroniza en la URL para marcadores, pero se evalúa en memoria del navegador sobre el listado devuelto por la API. **Jamás se envía a la red**. |

### 2.3 Estrategia de Invalidación en Cascada
Las mutaciones de actualización y eliminación sobre compras ya implementadas en `src/hooks/queries/use-expenses.ts` disparan la siguiente invalidación:
```typescript
// Al actualizar con useUpdateExpense (PUT):
queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId) });
queryClient.invalidateQueries({ queryKey: queryKeys.expenses.schedule(expenseId) });
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

// Al eliminar con useDeleteExpense (DELETE):
queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
```

---

## 3. Sanitización de Payloads para `PUT` y Normalización a Nulo

### 3.1 El Problema de Metadatos en `PUT /api/v1/expenses/{id}`
El endpoint de actualización en la API es un `PUT` que requiere el esquema completo `ExpenseUpdate`.
Los datos leídos de la compra (`ExpenseRead`) contienen en `splits` campos de lectura generados por la base de datos: `id`, `created_at`, `updated_at`. Si estos objetos se reenvían directamente en el `PUT`, Pydantic V2 los rechaza inmediatamente con `422 Unprocessable Entity` debido a la restricción `extra="forbid"` (`additionalProperties: false`).

### 3.2 Función de Sanitización `sanitizeExpenseUpdatePayload`
En `src/features/expenses/utils/expense-payload.ts`:
```typescript
import type { ExpenseRead, ExpenseUpdate, ExpenseSplitInput } from '@/types/api.types';

export interface ExpenseEditValues {
  description: string;
  first_billing_override?: string | null;
  notes?: string | null;
}

/**
 * Sanitiza los datos de un gasto existente y sus splits para despachar un PUT limpio
 * conforme al esquema estricto ExpenseUpdate, eliminando metadatos de lectura (id, created_at, updated_at)
 * y normalizando cadenas vacías a null.
 */
export function sanitizeExpenseUpdatePayload(
  currentExpense: ExpenseRead,
  updatedValues: ExpenseEditValues,
): ExpenseUpdate {
  const isOverrideEmpty =
    !updatedValues.first_billing_override || updatedValues.first_billing_override.trim() === '';
  const areNotesEmpty = !updatedValues.notes || updatedValues.notes.trim() === '';

  const sanitizedSplits: ExpenseSplitInput[] = currentExpense.splits.map((split) => {
    if (split.split_type === 'EQUAL') {
      return {
        person_id: split.person_id,
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      };
    }
    if (split.split_type === 'PERCENTAGE') {
      return {
        person_id: split.person_id,
        split_type: 'PERCENTAGE',
        percentage: split.percentage ? String(split.percentage).trim() : null,
        fixed_amount: null,
      };
    }
    return {
      person_id: split.person_id,
      split_type: 'FIXED_AMOUNT',
      percentage: null,
      fixed_amount: split.fixed_amount ? String(split.fixed_amount).trim() : null,
    };
  });

  return {
    card_id: currentExpense.card_id,
    description: updatedValues.description.trim(),
    total_amount: currentExpense.total_amount,
    purchase_date: currentExpense.purchase_date,
    installments_count: currentExpense.installments_count,
    first_billing_override: isOverrideEmpty ? null : updatedValues.first_billing_override?.trim() ?? null,
    notes: areNotesEmpty ? null : updatedValues.notes?.trim() ?? null,
    splits: sanitizedSplits,
  };
}
```

---

## 4. Diseño UI/UX, Accesibilidad DOM y Componentes

### 4.1 Ficha Semántica de Gasto (`ExpenseCard`) y Accesibilidad
- **Elemento Contenedor**: Etiqueta `<article>` con clases semánticas de superficie `#12141C` y borde `#232736`.
- **Prevención de Controles Anidados**:
  - Se prohíbe anidar elementos `<button>` dentro de otros `<button>` o envolver toda la tarjeta en un botón gigante.
  - La tarjeta presenta un botón accesible explícito *"Ver cronograma"* (o acción principal destacada).
  - El menú de opciones (*DropdownMenu* con *"Editar"* y *"Eliminar"*) se coloca como un elemento hermano adyacente que intercepta eventos con `e.stopPropagation()`.
- **Tratamiento Seguro de Fechas**:
  - `purchase_date` se procesa mediante `formatDate(expense.purchase_date)` (que divide por guión sin invocar `new Date()` en UTC), evitando que el 16 de octubre se dibuje como 15 de octubre en Chile/Sudamérica.
- **Formateo de Cifras**:
  - `formatCurrency(expense.total_amount, currency)` en tipografía `font-mono` con `tabular-nums`.

### 4.2 Barra de Filtros y Búsqueda en Memoria (`ExpenseFiltersBar`)
- Selectores desplegables estilizados (`#1A1D28` background, `#232736` border):
  - **Tarjeta**: Lista tarjetas disponibles con nombre y últimos 4 dígitos.
  - **Participante**: Lista personas participantes.
  - **Período**: Selector de mes/año con formato `YYYY-MM`.
- **Caja de Búsqueda**: Campo de texto con icono de lupa. Al escribir, actualiza `?q=...` en la URL y filtra la colección en memoria instantáneamente mediante normalización (`toLowerCase().normalize('NFD')`).
- **Botón "Limpiar filtros"**: Visible si `card_id`, `person_id`, `period` o `q` están presentes en los searchParams.

### 4.3 Cronograma de Amortización al Vuelo (`ExpenseScheduleDrawer`)
- Modal adaptativo: `Drawer` (Vaul) en móvil (`< 768px`) y `Dialog` en escritorio (`>= 768px`).
- Consume `useExpenseSchedule(expenseId)` (`GET /api/v1/expenses/{id}/schedule`).
- Cabecera con datos informativos (Comercio, Tarjeta enmascarada, Divisa, Monto total, Plazo en cuotas).
- Tabla estructurada con columnas:
  1. Cuota (`installment_label`, ej. `1/3`)
  2. Facturación / Corte (`statement_period` y `formatDate(closing_date)`)
  3. Vencimiento / Pago (`payment_period` y `formatDate(due_date)`)
  4. Monto cuota (`formatCurrency(installment_amount, currency)`)
  5. Desglose individual (`person_shares` con nombre de participante y cuota individual)
- **Regla de Resaltado sin Lógica Financiera**:
  - Se resalta visualmente la fila donde `item.payment_period === activePeriodParam` (obtenido de la URL o el resumen de sesión) con borde `#10B981` y badge *"Próximo pago"*. Cero cálculo de fechas en cliente.

### 4.4 Formulario de Edición (`ExpenseEditDialog`)
- Modal adaptativo para editar `description`, `first_billing_override` y `notes`.
- Muestra los datos estructurales (`card_name`, `total_amount`, `installments_count`, `splits`) en modo de solo lectura informativo.
- **Protección Anti-Cierre**: `dismissible={!isDirty}` en Vaul / Radix para impedir el cierre por toque en el fondo cuando se han editado datos.
- Despacha `useUpdateExpense` enviando el payload resultante de `sanitizeExpenseUpdatePayload`.
- Mapea inline errores `422` usando `mapPydanticErrorsToForm`.

### 4.5 Diálogo de Eliminación (`ExpenseDeleteDialog`)
- Diálogo modal accesible `AlertDialog` con variante destructiva `#F43F5E`.
- Despacha `useDeleteExpense.mutateAsync(expenseId)`.
- Maneja `404 Not Found` en caso de eliminación concurrente con toast informativo.

---

## 5. Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Justificación Arquitectónica | Alternativa Descartada y Razón de Rechazo |
| :--- | :--- | :--- |
| **Búsqueda `q` exclusivamente en memoria de cliente** | El endpoint del backend no soporta parámetro `q`. Filtrar en cliente es instantáneo (<10ms), no satura la red y sincroniza fluidamente con la URL. | **Enviar `q` como query param a la API**: Descartada porque FastAPI rechazaría el request con `422 Unprocessable Entity` al recibir parámetros query no declarados en el contrato. |
| **Mapeo explícito `period` (URL) <-> `active_in_period` (Red)** | En la URL es más conciso y amigable `?period=2026-11`, mientras que en red el contrato OpenAPI exige `active_in_period=2026-11`. | **Exponer `?active_in_period=` en la URL**: Descartada por ser innecesariamente verbosa para el usuario final. |
| **Sanitización de splits previa a `PUT`** | Elimina `id`, `created_at`, `updated_at` para respetar estrictamente `ExpenseSplitInput` con `extra="forbid"` de Pydantic V2. | **Enviar los splits de lectura directamente**: Descartada porque el backend falla con `422` inmediato ante campos no permitidos. |
| **Estructura `<article>` con botón explícito de cronograma** | Evita la violación de accesibilidad de botones anidados (`button` dentro de `button`), garantizando foco por teclado y compatibilidad estricta con lectores de pantalla. | **Hacer que toda la tarjeta sea un `<button>`**: Descartada porque colocar el menú contextual dentro genera HTML inválido y comportamientos impredecibles en el DOM. |
| **Resaltado de cuota por igualdad de strings** | Cumple con el principio de Zero Financial Math on Client; el cliente no adivina ni calcula qué cuota toca pagar según calendarios bancarios. | **Calcular en JavaScript la cuota del mes según `new Date()`**: Descartada por violar la regla innegociable de no hacer aritmética financiera en cliente. |
| **Protección `dismissible={!isDirty}` en edición** | Impide perder modificaciones accidentales por deslizamientos o toques involuntarios fuera del modal. | **Permitir cierre por backdrop siempre**: Descartada por frustración de usuario ante pérdida de datos en movilidad. |

---

## 6. Estrategia de Tests y Verificación

### 6.1 Matriz de Cobertura de Requisitos Funcionales en Pruebas

| Suite de Prueba | Archivo de Prueba | RF Cubiertos | Casos Clave Verificados |
| :--- | :--- | :--- | :--- |
| **Sanitización de Payload** | `src/features/expenses/utils/expense-payload.test.ts` | RF-04 | Descarte de metadatos de splits, preservación de datos maestros y normalización a `null`. |
| **Ficha de Gasto** | `src/features/expenses/components/expense-card.test.tsx` | RF-01 | Renderizado semántico `<article>`, parseo determinista de fechas, formato monetario tabular, chips y menú contextual con `stopPropagation`. |
| **Barra de Filtros** | `src/features/expenses/components/expense-filters-bar.test.tsx` | RF-02 | Selectores de tarjeta, persona y período; mapeo de `period` a `active_in_period`; búsqueda `q` en memoria; botón *"Limpiar filtros"*. |
| **Cronograma de Amortización** | `src/features/expenses/components/expense-schedule-drawer.test.tsx` | RF-03 | Desglose cuota a cuota, fechas deterministas, resaltado literal de strings (`payment_period === active_in_period`) y nota de cero cálculo financiero. |
| **Diálogo de Eliminación** | `src/features/expenses/components/expense-delete-dialog.test.tsx` | RF-05 | Confirmación previa accesible, llamada a `useDeleteExpense`, manejo de `404` e invalidación de caché. |
| **Formulario de Edición** | `src/features/expenses/components/expense-edit-dialog.test.tsx` | RF-04 | Precarga de datos, protección `dismissible={!isDirty}`, despacho de `PUT` sanitizado, mapeo de errores `422` y manejo de `404`. |
| **Listado y Estados Vacíos** | `src/features/expenses/components/expense-list.test.tsx` | RF-01, RF-06 | Skeletons de carga, estado vacío global con CTA "Registrar gasto", estado vacío por filtros con "Limpiar filtros". |
| **Coordinador de Vista** | `src/features/expenses/expenses-view.test.tsx` | RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 | Integración de filtros, filtrado en memoria por `q`, coordinación de modales y sincronización con searchParams. |
| **Montaje en Ruta** | `src/app/(main)/expenses/page.test.tsx` | RF-01 | Renderizado en página con Suspense boundary y layout. |
| **Suite de Integración End-to-End** | `src/features/expenses/expenses-flow.test.tsx` | RF-01 a RF-06 | Flujo completo simulado (explorar, filtrar, buscar, ver cronograma, editar, eliminar y tolerar errores 404). |

### 6.2 Comandos de Verificación Técnica
1. Pruebas unitarias y de integración: `npx vitest run src/features/expenses src/app/\(main\)/expenses`.
2. Verificación de tipos estricta: `npx tsc --noEmit`.
3. Linter: `npm run lint`.
4. Build de producción: `npm run build`.
