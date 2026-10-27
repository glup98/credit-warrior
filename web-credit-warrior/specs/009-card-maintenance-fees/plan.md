# Plan Técnico 009 — Gestión de Mantención de Tarjetas: Configuración Base, Sobreescrituras Mensuales y Transparencia en Dashboard (`009-card-maintenance-fees`)

- **Estado:** aprobado
- **Versión:** 1.0.0
- **Fecha:** 2026-10-23
- **Especificación Relacionada:** [`specs/009-card-maintenance-fees/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/009-card-maintenance-fees/spec.md) (v1.0.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§1, §3.1, §4.1, §5.2), [`docs/resume-api.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume-api.md) (§1.5, §3.1, §3.2, §3.5), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura para la Spec 009 actualiza el modelo de dominio de tarjetas para soportar comisiones de mantención mensual base y por período, añade los contratos de servicio y hooks en TanStack Query para `/api/v1/cards/{card_id}/fees`, incorpora el componente adaptativo `CardFeesDialog` en `src/features/cards/`, actualiza el formulario de tarjeta y el paso de Onboarding, y enriquece `CardBreakdownSection` en el Dashboard con transparencia contable y visualización de la regla de inactividad.

```text
web-credit-warrior/
├── src/
│   ├── types/
│   │   └── api.types.ts                         # CardRead/Create/Update con default_monthly_fee, CardMonthlyFeeResponse, FeeSourceEnum, CardMonthlySummary y CardPersonBreakdown extendidos
│   ├── schemas/
│   │   ├── card.schema.ts                       # cardCreateSchema y cardUpdateSchema con validación de default_monthly_fee; cardMonthlyFeeSchema
│   │   └── card.schema.test.ts                  # Pruebas unitarias de esquemas Zod con reglas de mantención CLP/USD
│   ├── lib/
│   │   └── query-keys.ts                        # queryKeys.cards.fees y queryKeys.cards.feeDetail
│   ├── services/
│   │   └── cards.service.ts                     # listCardFees, getCardFee, setCardFee, deleteCardFee
│   ├── hooks/
│   │   └── queries/
│   │       ├── use-cards.ts                     # useCardFees, useCardFee, useSetCardFee, useDeleteCardFee con invalidación en cascada
│   │       └── use-cards.test.tsx               # Pruebas de hooks de tarifas de tarjeta y mutaciones
│   ├── features/
│   │   ├── cards/
│   │   │   ├── components/
│   │   │   │   ├── card-form-dialog.tsx         # Campo adaptativo default_monthly_fee (CLP sin decimales / USD con 2 decimales)
│   │   │   │   ├── card-item.tsx                # Visualización de mantención base ($4.500/mes) y opción "Gestionar mantención"
│   │   │   │   ├── card-fees-dialog.tsx         # Componente adaptativo (Dialog/Drawer) para listar, fijar y eliminar sobreescrituras
│   │   │   │   └── card-fees-dialog.test.tsx    # Pruebas unitarias de gestión de tarifas mensuales
│   │   │   ├── cards-view.tsx                   # Coordinador de vista con soporte de apertura de CardFeesDialog
│   │   │   └── cards-maintenance-fees-integration.test.tsx # Suite de integración E2E de mantención de tarjetas
│   │   ├── onboarding/
│   │   │   └── components/
│   │   │       ├── step-card.tsx                # Soporte de default_monthly_fee en el paso de creación de primera tarjeta
│   │   │       └── step-card.test.tsx           # Pruebas del formulario de tarjeta de onboarding
│   │   └── dashboard/
│   │       └── components/
│   │           ├── card-breakdown-section.tsx   # Desglose de purchases_total, maintenance_fee ($0 en inactividad), total_due, y fee_share por persona
│   │           └── card-breakdown-section.test.tsx # Pruebas unitarias de desglose contable de mantención en dashboard
```

---

## 2. Contratos de Datos, Mapeo de Endpoints y Estrategia de Caché

### 2.1 Mapeo de Endpoints OpenAPI Consumidos

| Operación | Método y Endpoint | Parámetros / Request Payload | Hook Consumido | Respuesta y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **Crear Tarjeta** | `POST /api/v1/cards` | `CardCreate` (`default_monthly_fee?: string`) | `useCreateCard()` | `201 Created (CardRead)`. Registra la tarjeta con su mantención base. |
| **Actualizar Tarjeta** | `PATCH /api/v1/cards/{card_id}` | `card_id: UUID`<br>`CardUpdate` (`default_monthly_fee?: string \| null`) | `useUpdateCard()` | `200 OK (CardRead)`. Actualiza parcialmente la tarjeta y su mantención base. |
| **Listar Tarifas de Tarjeta** | `GET /api/v1/cards/{card_id}/fees` | `card_id: UUID` (en ruta) | `useCardFees(cardId)` | `200 OK (CardMonthlyFeeResponse[])`. Lista cronológica de sobreescrituras registradas. |
| **Consultar Tarifa de Período** | `GET /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM` | `useCardFee(cardId, period)` | `200 OK (CardMonthlyFeeResponse)`. Retorna la tarifa efectiva y su fuente (`OVERRIDE` o `CARD_DEFAULT`). |
| **Sobreescribir Tarifa Mensual** | `PUT /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM`<br>`CardMonthlyFeeCreateOrUpdate` (`{ fee: string }`) | `useSetCardFee()` | `200 OK (CardMonthlyFeeResponse)`. Fija o actualiza la sobreescritura del mes. |
| **Eliminar Sobreescritura** | `DELETE /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM` | `useDeleteCardFee()` | `204 No Content`. Restaura el cobro de la tarifa base por defecto (`CARD_DEFAULT`). |
| **Resumen de Dashboard** | `GET /api/v1/dashboard/summary` | `period?: YYYY-MM` | `useDashboardSummary(period)` | `200 OK (DashboardSummaryResponse)`. Expone `purchases_total`, `maintenance_fee`, `total_due`, y en personas `purchases_amount`, `fee_share`, `amount_due`. |

### 2.2 Estrategia de Caché e Invalidación en Cascada

En `src/lib/query-keys.ts`:
```typescript
cards: {
  all: ['cards'] as const,
  list: (filters?: CardFilters) => [...queryKeys.cards.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...queryKeys.cards.all, 'detail', id] as const,
  fees: (cardId: string) => [...queryKeys.cards.detail(cardId), 'fees'] as const,
  feeDetail: (cardId: string, period: string) => [...queryKeys.cards.fees(cardId), period] as const,
}
```

- Mutaciones de `useSetCardFee` y `useDeleteCardFee`:
  ```typescript
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.fees(variables.cardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.cardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  }
  ```
- Mutaciones de `useCreateCard` y `useUpdateCard`:
  - Ya invalidan `cards.all` y `dashboard.all`.

---

## 3. Esquemas de Validación Estrictos con Zod (`card.schema.ts`)

En estricto cumplimiento con Pydantic V2 (`extra="forbid"`):

```typescript
import { z } from 'zod';

export const currencyEnumSchema = z.enum(['CLP', 'USD']);

export const decimalStringRegex = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
export const integerStringRegex = /^(?:0|[1-9]\d*)$/;

export const defaultMonthlyFeeSchema = z
  .string()
  .trim()
  .refine(
    (val) => decimalStringRegex.test(val),
    'Debe ser un monto válido mayor o igual a 0',
  )
  .default('0');

export const cardCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre de la tarjeta es obligatorio').max(100),
    last_four_digits: z.string().regex(/^\d{4}$/, 'Debe contener exactamente 4 dígitos').nullable().optional(),
    currency: currencyEnumSchema.default('CLP'),
    closing_day: z.coerce.number().int().min(1).max(31),
    due_day: z.coerce.number().int().min(1).max(31),
    default_monthly_fee: defaultMonthlyFeeSchema,
    is_active: z.boolean().default(true),
  })
  .strict();

export const cardUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).nullable().optional(),
    last_four_digits: z.string().regex(/^\d{4}$/).nullable().optional(),
    currency: currencyEnumSchema.nullable().optional(),
    closing_day: z.coerce.number().int().min(1).max(31).nullable().optional(),
    due_day: z.coerce.number().int().min(1).max(31).nullable().optional(),
    default_monthly_fee: z.string().trim().refine((val) => decimalStringRegex.test(val)).nullable().optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();

export const cardMonthlyFeeSchema = z
  .object({
    fee: z
      .string()
      .trim()
      .refine((val) => decimalStringRegex.test(val), 'Debe ser un monto válido mayor o igual a 0'),
  })
  .strict();
```

---

## 4. Diseño de Componentes UI y Experiencia de Usuario

### 4.1 Ficha de Tarjeta `CardItem` y Menú de Acciones
- Visualización de la tarifa base:
  - Si `default_monthly_fee > 0`: `$4.500/mes` o `US$5.00/mes` con `formatCurrency` y números tabulares.
  - Si `default_monthly_fee == "0"`: `$0/mes` con tipografía neutral `text-text-muted`.
- Elemento de menú en `DropdownMenu`:
  - Opción *"Gestionar mantención"* con icono `BadgePercent` o `Receipt`, llamando a `onManageFees?.(card)`.

### 4.2 Componente Adaptativo `CardFeesDialog`
- Implementado en `src/features/cards/components/card-fees-dialog.tsx`:
  - Responsive: `Dialog` en escritorio (`>= 768px`) y `Drawer` en móvil (`< 768px`).
  - Cabecera: Nombre de la tarjeta y banner informativo con la tarifa base predeterminada (`default_monthly_fee`).
  - Formulario compacto para ingresar sobreescritura:
    - Selector de mes `YYYY-MM` (o input de período con formateo).
    - Campo de tarifa validado según moneda (`CLP` entero / `USD` 2 decimales).
    - Botón *"Guardar tarifa"* con estado de carga `isPending`.
  - Lista de sobreescrituras registradas:
    - Mes en formato civil en español con `formatPeriod`.
    - Monto con `formatCurrency` y `tabular-nums`.
    - Badge distintivo `"OVERRIDE"` (`border-accent-warning/30 bg-accent-warning/15 text-accent-warning`).
    - Botón accesible para eliminar la sobreescritura con confirmación `AlertDialog`.
  - Estado vacío: cuando no hay excepciones registradas, mensaje confirmando que la tarjeta aplica su costo base en todos los ciclos.

### 4.3 Transparencia Contable en `CardBreakdownSection` (Dashboard)
- Para cada tarjeta con saldo en el período:
  - Encabezado con nombre, moneda y máscara `•••• 1234`.
  - Cifra principal de total exigible (`total_due`).
  - Bloque de transparencia contable:
    - Compras y cuotas: `formatCurrency(cardItem.purchases_total, cardItem.currency)`
    - Mantención mensual: `formatCurrency(cardItem.maintenance_fee, cardItem.currency)`
    - **Regla de inactividad**: Si `cardItem.purchases_total === "0"`, se muestra `maintenance_fee: "$0"` con distintivo *"Sin cobro por inactividad"*.
  - Sub-desglose por persona (`by_person`):
    - Para cada participante:
      - Nombre y avatar.
      - Total a pagar: `formatCurrency(person.amount_due, cardItem.currency)` en `tabular-nums`.
      - Detalle desglosado: `(Compras: ${formatCurrency(person.purchases_amount)} + Mantención: ${formatCurrency(person.fee_share)})`.

---

## 5. Registro de Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Cálculo de Reparto $1/M$ y Redondeo** | Delegar 100% de la división al backend (`fee_share`). | Calcular en el cliente la división de mantención entre las personas. | Principio innegociable de Zero Financial Math on Client. La API absorbe el residuo en la última persona ordenada por UUID; calcular en cliente crearía desincronizaciones y descuadres contables. |
| **Gestión de Sobreescrituras** | Componente adaptativo `CardFeesDialog` desacoplado del formulario de tarjeta. | Incluir una tabla compleja de meses dentro del formulario de edición de tarjeta (`CardFormDialog`). | Sobrecargaría el formulario básico de la tarjeta y complicaría la validación de ciclo de vida. Desacoplarlo en su propio panel modal permite consultar y mutar tarifas mes a mes sin tocar los datos maestros de la tarjeta. |
| **Normalización de Montos Vacíos** | Normalizar cadenas vacías a `"0"`. | Enviar `null` o rechazar con error requerido. | En el modelo bancario, no ingresar mantención equivale a costo cero (`"0"`). Normalizar a `"0"` ofrece una mejor experiencia de usuario sin fricción ni errores `422`. |
| **Regla de Inactividad en Dashboard** | Renderizar lo devuelto por el servidor (`maintenance_fee: "0"`). | Intentar evaluar en cliente `if (purchases == 0) hideFee()`. | El backend ya aplica de forma soberana la regla de inactividad bancaria. El frontend solo expone el estado oficial e informa al usuario por qué la mantención fue $0. |

---

## 6. Estrategia de Pruebas y Verificación

| Nivel de Prueba | Componente / Archivo | Cobertura de RF | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **Unitaria (Esquemas)** | `src/schemas/card.schema.test.ts` | RF-01, RF-03 | Validación estricta de `default_monthly_fee` (CLP entero vs USD 2 decimales, no negativo) y `cardMonthlyFeeSchema`. |
| **Unitaria (Hooks y Servicios)** | `src/hooks/queries/use-cards.test.tsx` | RF-03, RF-04 | Consulta de `useCardFees`, mutación `useSetCardFee` con invalidación de `cards.fees` y `dashboard.all`, y `useDeleteCardFee`. |
| **Unitaria (Componente)** | `src/features/cards/components/card-form-dialog.test.tsx` | RF-01 | Campo de mantención base, normalización a `"0"`, validación por divisa y actualización. |
| **Unitaria (Componente)** | `src/features/onboarding/components/step-card.test.tsx` | RF-01 | Integración de mantención base en el paso de tarjeta del wizard de bienvenida. |
| **Unitaria (Componente)** | `src/features/cards/components/card-item.test.tsx` | RF-02 | Visualización de mantención base formateada (`$4.500/mes`), estado en cero y menú con opción de gestionar tarifas. |
| **Unitaria (Componente)** | `src/features/cards/components/card-fees-dialog.test.tsx` | RF-03, RF-04, RF-07 | Apertura adaptativa, guardado `PUT`, listado con badge `OVERRIDE`, eliminación `DELETE` y empty state. |
| **Unitaria (Componente)** | `src/features/dashboard/components/card-breakdown-section.test.tsx` | RF-05, RF-06 | Desglose de `purchases_total`, `maintenance_fee`, `total_due`, regla de inactividad ($0), y en personas `purchases_amount` + `fee_share`. |
| **Integración E2E** | `src/features/cards/cards-maintenance-fees-integration.test.tsx` | RF-01 a RF-07 | Ciclo completo: creación de tarjeta con tarifa base -> visualización en catálogo -> sobreescritura mensual en dialog -> reflejo en dashboard -> eliminación de sobreescritura y build limpio. |
