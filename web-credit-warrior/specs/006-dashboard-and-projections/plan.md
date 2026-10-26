# Plan Técnico 006 — Panel Financiero Principal, Resumen Mensual y Proyecciones (`006-dashboard-and-projections`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-21
- **Especificación Relacionada:** [`specs/006-dashboard-and-projections/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/006-dashboard-and-projections/spec.md) (v1.1.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§1, §3.1, §3.2, §4, §5.2), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`docs/resume.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume.md), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura para la Spec 006 modulariza el panel de control financiero mensual dentro de `src/features/dashboard/`, transformando la ruta raíz `src/app/(main)/page.tsx` en el centro de comando principal mediante componentes desacoplados para el selector de período, tarjetas KPI multimoneda, desgloses por persona y tarjeta, listado de cuotas activas (con reutilización de `ExpenseScheduleDrawer`) y gráfico de proyección apilado con Recharts.

```text
web-credit-warrior/
├── src/
│   ├── app/
│   │   └── (main)/
│   │       └── page.tsx                         # Página raíz / envuelta en <Suspense> con fallback de esqueletos estructurados
│   ├── features/
│   │   └── dashboard/
│   │       ├── components/
│   │       │   ├── period-selector.tsx          # Selector de mes < YYYY-MM > con botón atajo a próximo vencimiento
│   │       │   ├── currency-kpi-cards.tsx       # Tarjetas KPI de resumen CLP (#10B981) y USD (#38BDF8) con conteo de compromisos
│   │       │   ├── person-breakdown-section.tsx # Desglose por persona ("Cuánto paga cada uno") con color_hex en caché
│   │       │   ├── card-breakdown-section.tsx   # Desglose por tarjeta ("Estado por tarjeta") con máscara, fechas y sub-desglose
│   │       │   ├── active-installments-section.tsx # Listado de cuotas del mes e integración de ExpenseScheduleDrawer
│   │       │   ├── projection-chart.tsx         # Gráfico Recharts de barras apiladas a 6 meses con selector de moneda
│   │       │   └── dashboard-skeletons.tsx      # Esqueletos visuales estructurados que preservan la geometría del panel (CLS < 0.05)
│   │       ├── dashboard-view.tsx               # Coordinador de vista, resolución cruzada de catálogos y resiliencia de red
│   │       └── dashboard-integration.test.tsx   # Suite de integración e2e con simulación de navegación, drawer y acciones
│   ├── lib/
│   │   ├── date-period.ts                       # Aritmética entera determinista para navegación YYYY-MM y validación regex
│   │   ├── date-period.test.ts                  # Pruebas unitarias de desbordamiento de año y validación de período
│   │   ├── formatters.ts                        # formatDate, formatPeriod, formatCurrency, formatMaskedCard (reutilizados)
│   │   └── query-keys.ts                        # queryKeys.dashboard, queryKeys.cards, queryKeys.persons (reutilizados)
│   ├── hooks/
│   │   └── queries/
│   │       ├── use-dashboard.ts                 # useDashboardSummary y useDashboardProjection (reutilizados)
│   │       ├── use-cards.ts                     # useCards() para resolución de last_four_digits e is_active (reutilizado)
│   │       └── use-persons.ts                   # usePersons() para resolución de color_hex (reutilizado)
│   └── schemas/
│       └── dashboard.schema.ts                  # Esquemas Zod estrictos para parámetros de período y proyección
```

---

## 2. Contratos de Datos, Mapeo de Endpoints y Estrategia de Caché

### 2.1 Mapeo de Endpoints OpenAPI Consumidos

| Operación | Método y Endpoint | Parámetros / Request Payload | Hook Consumido | Respuesta y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **Resumen Mensual** | `GET /api/v1/dashboard/summary` | `period?: YYYY-MM` (opcional; si se omite, retorna próximo vencimiento) | `useDashboardSummary(period)` | `200 OK (DashboardSummaryResponse)`. `{ period, totals_by_currency, by_card, by_person, active_installments }`. |
| **Proyección Multimoneda** | `GET /api/v1/dashboard/projection` | `start_period?: YYYY-MM`<br>`months?: 1..24` (default `6`) | `useDashboardProjection(params)` | `200 OK (DashboardProjectionResponse)`. `{ start_period, months, periods: DashboardSummaryResponse[] }`. |
| **Catálogo de Tarjetas** | `GET /api/v1/cards` | — | `useCards()` | `200 OK (CardRead[])`. Resolución en memoria de `last_four_digits` e `is_active` para `by_card` y `active_installments`. |
| **Catálogo de Personas** | `GET /api/v1/persons` | — | `usePersons()` | `200 OK (PersonRead[])`. Resolución en memoria de `color_hex` para `by_person` y las series del gráfico de proyección. |
| **Cronograma de Amortización** | `GET /api/v1/expenses/{id}/schedule` | `expense_id: UUID` (en ruta) | `useExpenseSchedule(expenseId)` (dentro de `ExpenseScheduleDrawer`) | `200 OK (ExpenseScheduleResponse)`. Despliega el cronograma completo resaltando la fila donde `payment_period === activePeriod`. |

### 2.2 Sincronización en URL Search Params y Validación Previa

La sincronización del período seleccionado opera mediante el parámetro de consulta `?period=YYYY-MM`:

| Parámetro en URL | Formato Válido | Comportamiento si es Válido | Comportamiento si es Inválido o Ausente |
| :--- | :--- | :--- | :--- |
| `period` | `^\d{4}-(0[1-9]|1[0-2])$` | Se solicita `GET /api/v1/dashboard/summary?period=YYYY-MM` y `GET /api/v1/dashboard/projection?start_period=YYYY-MM&months=6`. | Se solicita sin parámetro a la API (`period=undefined`). Al responder con el período por defecto (`data.period`), se actualiza la URL mediante `router.replace('?period=' + data.period, { scroll: false })`. |

### 2.3 Estrategia de Caché e Invalidación en Cascada

TanStack Query gestiona el estado remoto del Dashboard a través de `queryKeys.dashboard`:
- `queryKeys.dashboard.summary(period)`: clave única por mes (`['dashboard', 'summary', period ?? 'next']`).
- `queryKeys.dashboard.projection(params)`: clave única por mes de inicio y horizonte (`['dashboard', 'projection', { start_period, months }]`).
- `staleTime`: configurado en 30 segundos en `src/hooks/queries/use-dashboard.ts`, con `refetchOnWindowFocus: true`.
- **Invalidación en cascada garantizada**: Toda mutación en compras (`useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`), tarjetas (`useCreateCard`, `useUpdateCard`, `useDeleteCard`) o personas (`useCreatePerson`, `useUpdatePerson`, `useDeletePerson`) ya ejecuta `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`, refrescando reactivamente los datos del Dashboard sin recargas de página.

---

## 3. Resolución Cruzada de Metadatos en Memoria (Zero Redundant Network Calls)

### 3.1 El Desafío de los Metadatos en `DashboardSummaryResponse`
Los esquemas de resumen mensual del servidor están normalizados para agregaciones numéricas y no duplican atributos decorativos:
1. `PersonMonthlySummary` no incluye `color_hex`.
2. `CardMonthlySummary` y `ActiveInstallmentItem` no incluyen `last_four_digits` ni `is_active`.

### 3.2 Estrategia de Resolución Local
El coordinador de vista (`DashboardView`) aprovecha que los catálogos `usePersons()` y `useCards()` ya están cacheados por TanStack Query en el shell de la aplicación:
- **Mapa de Personas**: `Map<string, PersonRead>` indexado por `id`.
  - Para cada ítem en `by_person`, se extrae `color_hex = personsMap.get(item.person_id)?.color_hex ?? '#8A93A6'`.
- **Mapa de Tarjetas**: `Map<string, CardRead>` indexado por `id`.
  - Para cada tarjeta en `by_card` y cada cuota en `active_installments`, se extrae:
    - `last_four_digits = cardsMap.get(card_id)?.last_four_digits ?? null`.
    - `is_active = cardsMap.get(card_id)?.is_active ?? true`.
  - Si `last_four_digits` existe, se formatea con `formatMaskedCard` (`•••• 1234`). Si no existe, se omite limpiamente.
  - Si `is_active === false`, se renderiza una píldora visual de *"Archivada"* (`Badge` variante outline / muted).

---

## 4. Aritmética Entera Determinista para Períodos (`date-period.ts`)

Para erradicar definitivamente desfases provocados por zonas horarias occidentales (como UTC-3 o UTC-4) al manipular fechas en JavaScript, la navegación temporal no utiliza el constructor `new Date("YYYY-MM")`.

Se implementa en `src/lib/date-period.ts`:
```typescript
export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period?: string | null): boolean {
  if (!period || typeof period !== 'string') return false;
  return PERIOD_REGEX.test(period.trim());
}

export function getNextPeriod(period: string): string {
  if (!isValidPeriod(period)) throw new Error(`Invalid period: ${period}`);
  const [yearStr, monthStr] = period.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getPreviousPeriod(period: string): string {
  if (!isValidPeriod(period)) throw new Error(`Invalid period: ${period}`);
  const [yearStr, monthStr] = period.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);

  if (month === 1) {
    year -= 1;
    month = 12;
  } else {
    month -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}
```

---

## 5. Esquemas de Validación Estrictos con Zod (`dashboard.schema.ts`)

En cumplimiento de las reglas de `constitution.md` y Pydantic V2 (`extra="forbid"`):

```typescript
import { z } from 'zod';

export const periodStringSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El formato del período debe ser YYYY-MM');

export const dashboardSummaryParamsSchema = z
  .object({
    period: periodStringSchema.optional().nullable(),
  })
  .strict();

export const dashboardProjectionParamsSchema = z
  .object({
    start_period: periodStringSchema.optional().nullable(),
    months: z.number().int().min(1).max(24).default(6),
  })
  .strict();
```

---

## 6. Diseño UI/UX y Sistema de Componentes Dark Mode

### 6.1 Tokens Semánticos Utilizados
- Canvas base: `--bg-canvas` (`#090A0F`)
- Superficie de tarjetas y módulos: `--bg-surface` (`#12141C`)
- Superficies elevadas y hover: `--bg-elevated` (`#1A1D28`)
- Bordes de estructura: `--border-subtle` (`#232736`)
- Texto titular: `--text-primary` (`#F3F5F8`)
- Texto secundario y etiquetas: `--text-muted` (`#8A93A6`)
- Acento Pesos Chilenos (CLP): `--accent-clp` (`#10B981`)
- Acento Dólares (USD): `--accent-usd` (`#38BDF8`)
- Acento de Alerta / Peligro: `--accent-danger` (`#F43F5E`)

### 6.2 Integración Delimitada de Recharts en `ProjectionChart`
- Recharts requiere que los componentes SVG (`<Bar dataKey="..." />`) reciban valores de tipo `number` para calcular la altura y coordenadas vectoriales de los rectángulos.
- **Autorización acotada**: Se transforma el monto de cada participante mediante `Number(share.amount)` exclusivamente para la propiedad apilada de Recharts.
- **Preservación inmutable de `string`**: Los textos en pantalla, ejes, leyendas y el `Tooltip` personalizado formatean los valores mediante `formatCurrency(val, currency)` con tipografía monoespaciada tabular (`tabular-nums`), garantizando total fidelidad numérica.
- **Segmentación por Persona**: Cada barra se divide en segmentos apilados (`<Bar stackId="a" dataKey={personId} fill={personColor} />`), respetando el `color_hex` configurado por el usuario.
- **Interacción de Clic**: Al hacer clic en una barra del mes futuro o pasado, se invoca `onSelectPeriod(period)`, actualizando la URL y el Dashboard al mes correspondiente.

### 6.3 Reutilización de `ExpenseScheduleDrawer` y `useQuickExpense`
- En `ActiveInstallmentsSection`, cada compromiso incluye el botón accesible *"Ver cronograma"*, el cual abre directamente el componente `ExpenseScheduleDrawer` importado desde `@/features/expenses/components/expense-schedule-drawer`, enviando:
  - `expenseId`: identificador de la compra.
  - `activePeriod`: período visualizado en el Dashboard (ej. `"2026-11"`).
  - La tabla del drawer resalta la fila de la cuota en curso mediante coincidencia literal de cadenas (`payment_period === activePeriod`).
- En el estado vacío del Dashboard cuando un mes no registra deudas, el botón CTA *"Registrar compra"* invoca `useQuickExpense().open()`, activando el drawer global sin recarga ni desvío de pantalla.

### 6.4 Envoltura `<Suspense>` en `src/app/(main)/page.tsx`
Para satisfacer los estándares de Next.js 15 App Router ante el consumo de `useSearchParams()` en componentes cliente, la página raíz encapsula la vista:

```tsx
import { Suspense } from 'react';
import { DashboardView } from '@/features/dashboard/dashboard-view';
import { DashboardSkeletons } from '@/features/dashboard/components/dashboard-skeletons';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeletons />}>
      <DashboardView />
    </Suspense>
  );
}
```

---

## 7. Registro de Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Navegación de Períodos** | Aritmética entera determinista en strings `YYYY-MM` (`date-period.ts`). | Objeto estándar `new Date("YYYY-MM")` con `setMonth()`. | `new Date("YYYY-MM")` en navegadores con husos horarios UTC negativos (ej. Chile UTC-3/UTC-4) desfasa la fecha al último día del mes anterior (e.g., `2026-10-31`), causando saltos de mes erráticos. |
| **Cruce de Metadatos Decorativos** | Resolución en memoria combinando datos del backend con `useCards()` y `usePersons()`. | Solicitar al backend agregar `color_hex`, `last_four_digits` e `is_active` en `DashboardSummaryResponse`. | El backend concentra agregaciones analíticas eficientes y su contrato OpenAPI está congelado. Los catálogos ya residen en la caché de TanStack Query en cliente sin costo de red adicional. |
| **Tipado Numérico en Recharts** | Conversión delimitada a `Number(amount)` solo para coordenadas SVG de `<Bar>`, preservando `string` en Tooltips. | Mantener strings en el dataset de Recharts o realizar conversiones globales de datos. | Recharts no puede calcular coordenadas SVG a partir de strings. Delimitar la conversión exclusivamente al pintado vectorial respeta el principio de inmutabilidad monetaria en todas las capas visibles. |
| **Apertura de Cronograma de Cuotas** | Reutilizar `ExpenseScheduleDrawer` pasando `activePeriod` desde el Dashboard. | Crear un modal duplicado de amortización específico para el Dashboard. | `ExpenseScheduleDrawer` ya maneja estados de carga, error, adaptación móvil/escritorio (Vaul/Dialog) y resaltado literal de cuota vigente. Duplicarlo violaría el principio DRY. |
| **Acceso a `useSearchParams`** | Encapsular la vista en `<Suspense fallback={<DashboardSkeletons />}>`. | Usar `useSearchParams` directamente sin Suspense o manejar estado solo en memoria local sin URL. | Next.js 15 exige límites de `<Suspense>` alrededor de hooks de búsqueda para permitir la generación estática del layout y evitar advertencias de deshidratación en producción. |

---

## 8. Estrategia de Pruebas y Verificación

| Nivel de Prueba | Alcance | Archivos Clave | Cobertura de RF | Criterio de Éxito |
| :--- | :--- | :--- | :--- | :--- |
| **Unitarias (Lógica pura)** | Aritmética de períodos y validación regex | `src/lib/date-period.test.ts` | RF-01 | Desbordamiento de año (12 a 01, 01 a 12), períodos inválidos rechazados, sin `Date`. |
| **Unitarias (Componentes)** | Selector de período y botón de atajo | `src/features/dashboard/components/period-selector.test.tsx` | RF-01 | Avance/retroceso de mes, botón próximo vencimiento, accesibilidad de controles. |
| **Unitarias (Componentes)** | Tarjetas KPI multimoneda y contadores | `src/features/dashboard/components/currency-kpi-cards.test.tsx` | RF-02 | Formateo tabular CLP/USD, derivación de conteo de compromisos, estados en cero. |
| **Unitarias (Componentes)** | Desglose por persona y resolución de color | `src/features/dashboard/components/person-breakdown-section.test.tsx` | RF-03 | Cruce con catálogo de personas, fallback `#8A93A6`, alineación tabular de montos. |
| **Unitarias (Componentes)** | Desglose por tarjeta y fechas deterministas | `src/features/dashboard/components/card-breakdown-section.test.tsx` | RF-04 | Cruce de máscara `•••• 1234`, distintivo *"Archivada"*, fechas de corte/vencimiento. |
| **Unitarias (Componentes)** | Cuotas activas y drawer de cronograma | `src/features/dashboard/components/active-installments-section.test.tsx` | RF-05 | Apertura de `ExpenseScheduleDrawer` con `activePeriod`, prevención de botones anidados. |
| **Unitarias (Componentes)** | Gráfico de proyección Recharts | `src/features/dashboard/components/projection-chart.test.tsx` | RF-06 | Alternancia de divisa, segmentos por persona, tooltip formateado, clic en barra. |
| **Unitarias (Componentes)** | Esqueletos visuales estructurados | `src/features/dashboard/components/dashboard-skeletons.test.tsx` | RF-07 | Preservación geométrica, atributos `aria-busy`. |
| **Integración de Vista** | Coordinador `DashboardView` | `src/features/dashboard/dashboard-view.test.tsx` | RF-01 a RF-07 | Orquestación de queries, normalización de URL corrupta, retry en error, CTA en vacío. |
| **Integración E2E & PWA** | Flujo completo en App Shell con `<Suspense>` | `src/features/dashboard/dashboard-integration.test.tsx` | RF-01 a RF-07 | Montaje en `/`, navegación entre meses, sincronización de searchParams y build en 0 errores. |
