# Tareas de Implementación 009 — Gestión de Mantención de Tarjetas: Configuración Base, Sobreescrituras Mensuales y Transparencia en Dashboard (`009-card-maintenance-fees`)

- **Estado:** completado
- **Versión:** 1.0.0
- **Fecha:** 2026-10-23
- **Plan Técnico:** [`specs/009-card-maintenance-fees/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/009-card-maintenance-fees/plan.md)
- **Especificación Relacionada:** [`specs/009-card-maintenance-fees/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/009-card-maintenance-fees/spec.md) (v1.0.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T8)

### [x] T1: Modelado de Contratos TypeScript y Esquemas Zod Estrictos para Mantención (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01, RF-03
- **Archivos involucrados:**
  - [`src/types/api.types.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/types/api.types.ts) (modificado)
  - [`src/schemas/card.schema.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/schemas/card.schema.ts) (modificado)
  - [`src/schemas/card.schema.test.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/schemas/card.schema.test.ts) (modificado)
- **Descripción:**
  1. En `src/types/api.types.ts`, extender los contratos de tarjetas y resúmenes:
     - Añadir `default_monthly_fee: string` en `CardRead`, `CardCreate` y opcional en `CardUpdate`.
     - Definir `FeeSourceEnum = 'OVERRIDE' | 'CARD_DEFAULT'`.
     - Definir `CardMonthlyFeeResponse`: `{ card_id: string; period: string; fee: string; source: FeeSourceEnum }`.
     - Definir `CardMonthlyFeeCreateOrUpdate`: `{ fee: string }`.
     - Asegurar que `CardMonthlySummary` expone `purchases_total: string`, `maintenance_fee: string`, `total_due: string` y `by_person: CardPersonBreakdown[]`.
     - Asegurar que `CardPersonBreakdown` expone `purchases_amount: string`, `fee_share: string`, `amount_due: string`.
  2. En `src/schemas/card.schema.ts`, definir las validaciones estrictas (`z.object().strict()`):
     - `defaultMonthlyFeeSchema`: cadena no negativa, normalizando cadenas vacías o espacios a `"0"`.
     - En `cardCreateSchema` y `cardUpdateSchema`, validar `default_monthly_fee` con refinamiento reactivo según `currency`: para `CLP` rechazar decimales (entero no negativo); para `USD` admitir hasta 2 decimales.
     - Definir `cardMonthlyFeeSchema = z.object({ fee: defaultMonthlyFeeSchema }).strict()`.
  3. En `src/schemas/card.schema.test.ts`, escribir pruebas unitarias exhaustivas:
     - Validación de CLP: acepta enteros (`"4500"`, `"0"`), rechaza decimales (`"4500.50"`), normaliza `""` a `"0"`.
     - Validación de USD: acepta decimales válidos (`"5.00"`, `"3.5"`, `"0"`), rechaza más de 2 decimales (`"5.123"`).
     - Rechazo de números negativos (`"-100"`).
     - Validación estricta de `cardMonthlyFeeSchema` prohibiendo propiedades desconocidas (`extra="forbid"`).
- **Hecho cuando:**
  `npx vitest run src/schemas/card.schema.test.ts` pasa al 100% en verde y `npx tsc --noEmit` compila sin errores de tipos.

---

### [x] T2: Capa de Servicios HTTP, Query Keys y Hooks TanStack Query con Invalidación en Cascada (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01, RF-03, RF-04
- **Archivos involucrados:**
  - [`src/lib/query-keys.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/lib/query-keys.ts) (modificado)
  - [`src/services/cards.service.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/services/cards.service.ts) (modificado)
  - [`src/hooks/queries/use-cards.ts`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/hooks/queries/use-cards.ts) (modificado)
  - [`src/hooks/queries/use-cards.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/hooks/queries/use-cards.test.tsx) (modificado)
- **Descripción:**
  1. En `src/lib/query-keys.ts`:
     - Añadir fábrica jerárquica para tarifas: `fees: (cardId: string) => [...queryKeys.cards.detail(cardId), 'fees'] as const` y `feeDetail: (cardId: string, period: string) => [...queryKeys.cards.fees(cardId), period] as const`.
  2. En `src/services/cards.service.ts`:
     - Implementar `listCardFees(cardId: string): Promise<CardMonthlyFeeResponse[]>`.
     - Implementar `getCardFee(cardId: string, period: string): Promise<CardMonthlyFeeResponse>`.
     - Implementar `setCardFee(cardId: string, period: string, data: CardMonthlyFeeCreateOrUpdate): Promise<CardMonthlyFeeResponse>`.
     - Implementar `deleteCardFee(cardId: string, period: string): Promise<void>`.
  3. En `src/hooks/queries/use-cards.ts`:
     - Crear `useCardFees(cardId: string)` y `useCardFee(cardId: string, period: string)`.
     - Crear mutación `useSetCardFee()` que invoca `setCardFee` e invalida en `onSuccess`: `cards.fees(cardId)`, `cards.detail(cardId)` y `dashboard.all`.
     - Crear mutación `useDeleteCardFee()` que invoca `deleteCardFee` e invalida en `onSuccess`: `cards.fees(cardId)`, `cards.detail(cardId)` y `dashboard.all`.
  4. En `src/hooks/queries/use-cards.test.tsx`:
     - Probar consulta exitosa de listado de tarifas.
     - Probar mutación de creación/actualización con `useSetCardFee` y verificar la invalidación en cascada de `cards.fees` y `dashboard.all`.
     - Probar mutación de eliminación con `useDeleteCardFee` y su respectiva invalidación en cascada.
- **Hecho cuando:**
  `npx vitest run src/hooks/queries/use-cards.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila limpiamente sin errores.

---

### [x] T3: Actualización de Formularios de Tarjeta con Campo Adaptativo de Mantención Base (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - [`src/features/cards/components/card-form-dialog.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-form-dialog.tsx) (modificado)
  - [`src/features/cards/components/card-form-dialog.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-form-dialog.test.tsx) (modificado)
  - [`src/features/onboarding/components/step-card.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/onboarding/components/step-card.tsx) (modificado)
  - [`src/features/onboarding/components/step-card.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/onboarding/components/step-card.test.tsx) (modificado)
- **Descripción:**
  1. En `CardFormDialog`:
     - Agregar campo `"Mantención mensual base"` (`default_monthly_fee`) con placeholder adaptativo (`"0"` en CLP, `"0.00"` en USD) y texto de ayuda explicativo: "Costo fijo mensual cobrado por el banco (ej. mantención de cuenta o tarjeta). Si no tiene costo, déjalo en 0."
     - Inicializar con `"0"` en creación y con el valor existente en edición (`card.default_monthly_fee`).
     - Validación dinámica en tiempo real según divisa seleccionada (CLP entero no negativo vs USD hasta 2 decimales).
     - Normalización antes de enviar: si el usuario deja el campo vacío o con espacios, convertirlo a `"0"`.
  2. En `StepCard` (Onboarding):
     - Incorporar el campo `"Mantención mensual base"` con valor predeterminado `"0"` y la misma validación adaptativa por divisa.
  3. En `card-form-dialog.test.tsx` y `step-card.test.tsx`:
     - Probar creación de tarjeta con mantención `"4500"` en CLP.
     - Probar rechazo de decimales en CLP e ingreso válido de `"3.50"` en USD.
     - Probar que input vacío transmite `"0"` al hook de mutación.
     - Probar que en edición se carga el valor previo de mantención base y se envía actualizado.
- **Hecho cuando:**
  `npx vitest run src/features/cards/components/card-form-dialog.test.tsx src/features/onboarding/components/step-card.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila sin errores.

---

### [x] T4: Exposición de Mantención Base y Acción de Tarifas en Tarjeta del Catálogo (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-02
- **Archivos involucrados:**
  - [`src/features/cards/components/card-item.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-item.tsx) (modificado)
  - [`src/features/cards/components/card-item.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-item.test.tsx) (modificado)
- **Descripción:**
  1. En `CardItem`:
     - Renderizar en la tarjeta el costo mensual base formateado:
       - Si `default_monthly_fee > 0`: mostrar el monto con divisa y periodicidad (ej. `"$4.500/mes"` o `"US$5.00/mes"`) usando `font-mono tabular-nums`.
       - Si `default_monthly_fee === "0"` o equivalente: distintivo neutral `"$0/mes"` o badge sutil indicando sin mantención.
     - En el menú de acciones (`DropdownMenu` / botón de opciones de la tarjeta), añadir la acción accesible `"Gestionar mantención"` (o `"Tarifas mensuales"`) con `aria-label="Gestionar mantención de {card.name}"`.
     - Emitir callback prop `onManageFees(card)` al hacer clic en dicha opción.
  2. En `card-item.test.tsx`:
     - Probar que tarjeta con mantención base muestra el importe formateado con `/mes`.
     - Probar que tarjeta con mantención cero muestra el indicador neutral sin costo.
     - Probar que al accionar `"Gestionar mantención"` se invoca `onManageFees` con los datos de la tarjeta.
- **Hecho cuando:**
  `npx vitest run src/features/cards/components/card-item.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila limpiamente.

---

### [x] T5: Componente Adaptativo de Gestión de Tarifas Mensuales `CardFeesDialog` (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-03, RF-04, RF-07
- **Archivos involucrados:**
  - [`src/features/cards/components/card-fees-dialog.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-fees-dialog.tsx) (nuevo)
  - [`src/features/cards/components/card-fees-dialog.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/components/card-fees-dialog.test.tsx) (nuevo)
- **Descripción:**
  1. Implementar `CardFeesDialog`:
     - Diseño adaptativo responsivo: modal centrado (`Dialog`) en pantallas `>= 768px` y panel deslizable inferior (`Drawer`) en móviles `< 768px` vía `useMediaQuery`.
     - Encabezado con nombre de tarjeta y visualización de la tarifa base por defecto (`CARD_DEFAULT`).
     - Formulario compacto para sobreescribir una tarifa mensual:
       - Selector de período (`YYYY-MM`) preseleccionado en el mes corriente.
       - Campo de entrada de tarifa (`fee`) con validación según divisa de la tarjeta y normalización de vacío a `"0"`.
       - Botón `"Guardar tarifa"` con indicador de carga durante la mutación `useSetCardFee`.
     - Listado cronológico de sobreescrituras registradas (`useCardFees`):
       - Período legible en español (ej. "Noviembre 2026").
       - Monto en tipografía monoespaciada tabular (`font-mono tabular-nums`).
       - Badge identificador `"Sobreescritura"` / `OVERRIDE`.
       - Botón con icono de papelera y accesibilidad WAI-ARIA (`aria-label="Eliminar tarifa de {period}"`) que invoca `useDeleteCardFee`.
     - Estados de interfaz:
       - Estado de carga: Skeletons durante la obtención de las tarifas.
       - Estado vacío: panel explicativo neutral cuando no hay sobreescrituras registradas, explicando que rige la tarifa base de la tarjeta.
       - Manejo de errores: retroalimentación con toasts (`sonner`) en guardado, eliminación o fallas de red/validación sin cerrar abruptamente el diálogo.
  2. Implementar `card-fees-dialog.test.tsx`:
     - Probar apertura, despliegue de skeleton de carga y renderizado de tarifa base.
     - Probar listado de sobreescrituras existentes con su período, monto y badge `OVERRIDE`.
     - Probar renderizado del estado vacío explicativo.
     - Probar formulario de creación/actualización con `useSetCardFee` exitoso y toast.
     - Probar eliminación con `useDeleteCardFee` y toast de restauración de tarifa base.
- **Hecho cuando:**
  `npx vitest run src/features/cards/components/card-fees-dialog.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila sin errores.

---

### [x] T6: Integración del Diálogo de Tarifas en la Vista Principal de Tarjetas (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-02, RF-03, RF-04
- **Archivos involucrados:**
  - [`src/features/cards/cards-view.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/cards-view.tsx) (modificado)
  - [`src/features/cards/cards-view.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/cards-view.test.tsx) (modificado)
- **Descripción:**
  1. En `CardsView`:
     - Agregar estado `feeCardTarget: CardRead | null` para gestionar la tarjeta seleccionada para administración de tarifas.
     - Pasar callback `onManageFees={(card) => setFeeCardTarget(card)}` a `CardList` y conectar con `CardItem`.
     - Renderizar `CardFeesDialog` controlado con `open={Boolean(feeCardTarget)}`, `card={feeCardTarget}` y `onOpenChange={(open) => !open && setFeeCardTarget(null)}`.
  2. En `cards-view.test.tsx`:
     - Verificar que al presionar `"Gestionar mantención"` en una tarjeta se abre `CardFeesDialog` con los datos de dicha tarjeta.
     - Verificar que al invocar el cierre del diálogo el estado `feeCardTarget` se restablece a `null`.
- **Hecho cuando:**
  `npx vitest run src/features/cards/cards-view.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila limpiamente sin advertencias ni errores.

---

### [x] T7: Transparencia Contable y Regla de Inactividad en Dashboard `CardBreakdownSection` (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-05, RF-06
- **Archivos involucrados:**
  - [`src/features/dashboard/components/card-breakdown-section.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/dashboard/components/card-breakdown-section.tsx) (modificado)
  - [`src/features/dashboard/components/card-breakdown-section.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/dashboard/components/card-breakdown-section.test.tsx) (modificado)
- **Descripción:**
  1. En `CardBreakdownSection`:
     - En el bloque de cada tarjeta del Dashboard:
       - Exponer claramente `purchases_total` ("Compras del mes").
       - Exponer `maintenance_fee` ("Mantención mensual").
       - Exponer `total_due` destacado ("Total a pagar").
     - Regla de inactividad:
       - Si `purchases_total === "0"` o `maintenance_fee === "0"` devuelto por el servidor, mostrar `"$0"` de mantención acompañado de una nota o distintivo discreto: *"Sin mantención por inactividad"*.
     - En el desglose individual por participante (`by_person`):
       - Exponer `purchases_amount` ("Compras propias").
       - Exponer `fee_share` ("Cuota de mantención"). Si `fee_share === "0"`, indicar `"$0"` de forma atenuada.
       - Exponer `amount_due` ("Total a pagar por la persona").
       - Emplear alineación tabular y números monoespaciados (`font-mono tabular-nums`).
  2. En `card-breakdown-section.test.tsx`:
     - Probar renderizado de tarjeta con compras (`purchases_total: "120000"`), mantención (`maintenance_fee: "4500"`) y total exigible (`total_due: "124500"`).
     - Probar tarjeta inactiva con compras `"0"`, mantención `"0"` y nota informativa de inactividad visible.
     - Probar sub-desglose por persona verificando que `purchases_amount`, `fee_share` y `amount_due` se renderizan fielmente con las cifras devueltas por la API.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/card-breakdown-section.test.tsx` pasa al 100% en verde y `npx tsc --noEmit` compila correctamente sin errores.

---

### [x] T8: Suite de Integración E2E y Verificación Completa de Regresión (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01 a RF-07
- **Archivos involucrados:**
  - [`src/features/cards/cards-maintenance-fees-integration.test.tsx`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/src/features/cards/cards-maintenance-fees-integration.test.tsx) (nuevo)
- **Descripción:**
  1. Implementar la suite de integración E2E en `cards-maintenance-fees-integration.test.tsx`:
     - **Flujo 1 (Creación y Catálogo)**: Crear tarjeta con `default_monthly_fee: "4500"` en CLP -> Validar que aparece en `/cards` con distintivo `"$4.500/mes"`.
     - **Flujo 2 (Sobreescritura Mensual)**: Abrir `CardFeesDialog` -> Guardar tarifa de promoción `$0` para el período `2026-11` vía `PUT` -> Validar que aparece en la lista con badge `OVERRIDE`.
     - **Flujo 3 (Transparencia en Dashboard)**: Validar consulta de Dashboard para período `2026-11` con mantención `$0` y desglose individual, y para `2026-12` con mantención base `$4.500`.
     - **Flujo 4 (Eliminación de Sobreescritura)**: Eliminar tarifa de `2026-11` vía `DELETE` -> Validar que el período vuelve a adoptar `CARD_DEFAULT` e invalida el Dashboard.
  2. Ejecutar la suite global de pruebas para certificar cero regresiones: `npm run test` y `npm run lint`.
  3. Ejecutar comprobación de tipos de TypeScript en todo el proyecto: `npx tsc --noEmit`.
- **Hecho cuando:**
  `npx vitest run src/features/cards/cards-maintenance-fees-integration.test.tsx` pasa al 100% en verde, `npm run test`, `npm run lint` y `npx tsc --noEmit` completan con 0 errores y código de salida 0.
