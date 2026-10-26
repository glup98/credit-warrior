# Tareas de Implementación 005 — Historial de Compras, Filtros Reactivos y Cronograma de Amortización (`005-expenses-history-and-schedule`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Plan Técnico:** [`specs/005-expenses-history-and-schedule/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/005-expenses-history-and-schedule/plan.md)
- **Especificación Relacionada:** [`specs/005-expenses-history-and-schedule/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/005-expenses-history-and-schedule/spec.md) (v1.1.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T10)

### [x] T1: Utilidad de Sanitización de Payload para `PUT /api/v1/expenses/{id}` y Normalización a Nulo (TDD)
- **RFs cubiertos:** RF-04
- **Archivos involucrados:**
  - `src/features/expenses/utils/expense-payload.ts`
  - `src/features/expenses/utils/expense-payload.test.ts`
- **Descripción:**
  Implementar mediante TDD la función `sanitizeExpenseUpdatePayload`:
  1. Recibe el gasto original (`ExpenseRead`) y los valores editados (`ExpenseEditValues`: `description`, `first_billing_override`, `notes`).
  2. Preserva íntegros los atributos estructurales requeridos por `ExpenseUpdate`: `card_id`, `total_amount`, `purchase_date` e `installments_count`.
  3. Mapea la lista de splits existentes a `ExpenseSplitInput` **descartando estrictamente los campos de solo lectura (`id`, `created_at`, `updated_at`)** para evitar errores `422 Unprocessable Entity` provocados por `extra="forbid"` de Pydantic V2.
  4. Si `split_type === 'EQUAL'`, asegura que `percentage` y `fixed_amount` se envíen como `null`.
  5. Normaliza cadenas vacías o compuestas solo de espacios en `first_billing_override` y `notes` a `null`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/utils/expense-payload.test.ts` pasa en verde con Vitest probando descarte de metadatos de splits, preservación de datos maestros y normalización de cadenas vacías a `null`; `tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Ficha Semántica de Gasto `ExpenseCard` con Fechas Deterministas y Accesibilidad DOM (TDD)
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-card.tsx`
  - `src/features/expenses/components/expense-card.test.tsx`
- **Descripción:**
  Implementar mediante TDD la ficha individual de gasto `ExpenseCard`:
  1. Estructura semántica en contenedor `<article>` con superficie `#12141C` y borde `#232736`.
  2. Muestra: concepto/descripción, tarjeta enmascarada (`•••• 1234`), `CurrencyBadge` (`CLP` o `USD`), fecha de compra parseada deterministamente con `formatDate` (sin desfase UTC), cantidad de cuotas, monto total en números tabulares (`formatCurrency`) y chips de personas participantes (`PersonChip`).
  3. Muestra distintivos para opciones avanzadas si existen (`first_billing_override` y notas).
  4. **Accesibilidad DOM sin Controles Anidados**:
     - Botón explícito *"Ver cronograma"* accesible para abrir el panel de amortización.
     - Menú contextual de opciones (*DropdownMenu* con *"Editar"* y *"Eliminar"*) como elemento hermano independiente que aplica `e.stopPropagation()` para no disparar la apertura accidental del cronograma.
     - Áreas táctiles mínimas de `44x44px` y foco accesible para teclado.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-card.test.tsx` pasa en verde con Vitest probando estructura semántica `<article>`, formateo determinista de fecha sin desfase UTC, números tabulares, chips de participantes, ausencia de botones anidados y menú contextual con `stopPropagation`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Barra Reactiva de Filtros y Búsqueda en Memoria `ExpenseFiltersBar` (TDD)
- **RFs cubiertos:** RF-02
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-filters-bar.tsx`
  - `src/features/expenses/components/expense-filters-bar.test.tsx`
- **Descripción:**
  Implementar mediante TDD la barra reactiva de filtros y búsqueda `ExpenseFiltersBar`:
  1. Selector de Tarjeta (`card_id`): Consume `useCards()` para listar opciones con nombre y máscara `•••• 1234`, o "Todas las tarjetas".
  2. Selector de Participante (`person_id`): Consume `usePersons()` para listar participantes, o "Todos los participantes".
  3. Selector de Período (`period`): Selector de mes `YYYY-MM`. Sincroniza en la URL como `period` y se mapea internamente a `active_in_period` para la API.
  4. Campo de Búsqueda por Texto (`q`): Input con lupa que sincroniza `?q=...` en la URL para enlaces compartibles pero se evalúa en memoria del cliente sin viajar a la red.
  5. Sincronización bidireccional inmediata en los searchParams de la URL sin recargar la página.
  6. Botón accesible *"Limpiar filtros"* visible cuando hay al menos un filtro o término de búsqueda activo, que restablece la URL y los selectores.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-filters-bar.test.tsx` pasa en verde probando selectores de tarjeta, persona y período, mapeo de `period` a `active_in_period`, campo de búsqueda `q`, botón *"Limpiar filtros"* y sincronización con searchParams; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Cronograma de Amortización al Vuelo `ExpenseScheduleDrawer` (TDD)
- **RFs cubiertos:** RF-03
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-schedule-drawer.tsx`
  - `src/features/expenses/components/expense-schedule-drawer.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `ExpenseScheduleDrawer` para proyectar el cronograma de cuotas:
  1. Modal adaptativo: `Drawer` (Vaul) en pantallas móviles (`< 768px`) y `Dialog` centrado en escritorio (`>= 768px`).
  2. Consume `useExpenseSchedule(expenseId)` (`GET /api/v1/expenses/{id}/schedule`). Muestra skeleton de carga mientras se obtienen los datos.
  3. Despliega la cabecera del gasto (Comercio, Tarjeta enmascarada, Divisa, Monto total, Plazo en cuotas).
  4. Renderiza la tabla cuota a cuota con $N$ filas conteniendo: número de cuota (`installment_label`), período de corte y fecha determinista (`closing_date`), período de pago y fecha límite determinista (`due_date`), monto de la cuota (`installment_amount`) y desglose por persona (`person_shares`).
  5. **Resaltado Literal de Cuota Vigente**: Compara literalmente `item.payment_period === activePeriodParam` (obtenido de la URL o período de sesión), destacando la cuota con borde `#10B981` y badge *"Próximo pago"* sin efectuar ninguna lógica financiera en cliente.
  6. Pie informativo indicando que el cálculo oficial y la absorción de residuos provienen exclusivamente del backend.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-schedule-drawer.test.tsx` pasa en verde probando consulta a `useExpenseSchedule`, renderizado adaptativo (Drawer/Dialog), fechas deterministas, resaltado por comparación literal de strings y nota de cero cálculo financiero; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T5: Diálogo de Confirmación Destructiva `ExpenseDeleteDialog` (TDD)
- **RFs cubiertos:** RF-05
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-delete-dialog.tsx`
  - `src/features/expenses/components/expense-delete-dialog.test.tsx`
- **Descripción:**
  Implementar mediante TDD el diálogo de eliminación `ExpenseDeleteDialog`:
  1. Confirmación destructiva accesible mediante `AlertDialog` con variante de peligro `#F43F5E`.
  2. Título explicativo *"¿Eliminar esta compra?"* y mensaje que advierte sobre la eliminación permanente del registro y su cronograma de cuotas asociado.
  3. Al confirmar, activa estado de carga en el botón (`isPending`) para prevenir doble envío y ejecuta `useDeleteExpense.mutateAsync(expenseId)`.
  4. Tras respuesta exitosa (`204 No Content`), cierra el diálogo, muestra toast (*"Compra eliminada exitosamente"*) e invalida en cascada `expenses.all` y `dashboard.all`.
  5. Tolerancia a concurrencia: si devuelve `404 Not Found`, cierra el diálogo, despliega toast informativo (*"La compra seleccionada ya no existe"*) e invalida consultas.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-delete-dialog.test.tsx` pasa en verde probando confirmación destructiva accesible, llamada a `useDeleteExpense`, manejo de `404 Not Found` concurrente, toast de éxito e invalidación en cascada; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T6: Formulario Adaptativo de Edición `ExpenseEditDialog` con Protección `dismissible={!isDirty}` (TDD)
- **RFs cubiertos:** RF-04
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-edit-dialog.tsx`
  - `src/features/expenses/components/expense-edit-dialog.test.tsx`
- **Descripción:**
  Implementar mediante TDD el formulario de edición `ExpenseEditDialog`:
  1. Modal adaptativo (Dialog en escritorio, Drawer en móvil) precargado con los datos del gasto: `description`, `first_billing_override` y `notes`.
  2. Muestra los datos estructurales (`card_id`, `total_amount`, `installments_count`, `splits`) en modo informativo no editable.
  3. **Protección Anti-Cierre Accidental**: Si el formulario ha sido modificado (`isDirty`), desactiva el cierre por clic o toque en el fondo (`dismissible={false}` condicional), requiriendo presionar explícitamente *"Cancelar"*.
  4. Al guardar, construye el payload limpio con `sanitizeExpenseUpdatePayload` y despacha `useUpdateExpense.mutateAsync({ id, data })` (`PUT /api/v1/expenses/{id}`).
  5. Mapea inline errores `422` usando `mapPydanticErrorsToForm` sin cerrar el formulario y maneja errores concurrentes `404`.
  6. Tras éxito, cierra el diálogo, muestra toast (*"Compra actualizada exitosamente"*) e invalida en cascada `expenses.all` y `dashboard.all`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-edit-dialog.test.tsx` pasa en verde probando precarga de datos, protección anti-cierre accidental cuando `isDirty`, despacho de `PUT` sanitizado con `useUpdateExpense`, mapeo inline de errores `422` y manejo de `404`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T7: Lista de Gastos, Skeletons y Estados Vacíos `ExpenseList` (TDD)
- **RFs cubiertos:** RF-01, RF-06
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-list.tsx`
  - `src/features/expenses/components/expense-list.test.tsx`
- **Descripción:**
  Implementar mediante TDD el contenedor visual `ExpenseList`:
  1. **Estado de Carga**: Muestra siluetas animadas (*skeletons*) estructuradas reproduciendo la forma de las fichas de compra para evitar saltos de diseño.
  2. **Estado Vacío Global**: Si `expenses.length === 0` y no hay filtros activos, muestra `EmptyState` empático con icono de recibo, mensaje explicativo y botón primario *"Registrar gasto"* que invoca `open()` de `QuickExpenseContext`.
  3. **Estado Vacío por Filtros**: Si no hay compras que coincidan con los filtros aplicados o el término de búsqueda, muestra `EmptyState` indicando la ausencia de coincidencias con botón *"Limpiar filtros"*.
  4. **Renderizado de Fichas**: Renderiza la lista de componentes `ExpenseCard` cuando existen datos válidos.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-list.test.tsx` pasa en verde probando estado de carga con skeletons estructurados, estado vacío global con CTA "Registrar gasto", estado vacío por filtros con acción "Limpiar filtros" y renderizado de tarjetas; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T8: Coordinador de Vista `ExpensesView` con Filtrado en Memoria `q` y Gestión de Modales (TDD)
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06
- **Archivos involucrados:**
  - `src/features/expenses/expenses-view.tsx`
  - `src/features/expenses/expenses-view.test.tsx`
- **Descripción:**
  Implementar mediante TDD el orquestador principal de la vista de compras `ExpensesView`:
  1. Lee `searchParams` (`card_id`, `person_id`, `period`, `q`) usando `useSearchParams()`.
  2. Invoca `useExpenses({ card_id, person_id, active_in_period: period })` para obtener los datos del servidor.
  3. **Evaluación de Búsqueda `q` en Memoria**: Filtra la lista retornada por el servidor verificando coincidencia parcial insensible a mayúsculas y acentos (`toLowerCase().normalize('NFD')`) sobre el atributo `description`.
  4. Gestiona el estado de apertura de los modales secundarios: compra seleccionada para cronograma (`selectedScheduleExpense`), compra en edición (`editingExpense`) y compra en eliminación (`deletingExpense`).
  5. Conecta `ExpenseFiltersBar`, `ExpenseList`, `ExpenseScheduleDrawer`, `ExpenseEditDialog` y `ExpenseDeleteDialog`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/expenses-view.test.tsx` pasa en verde probando integración de filtros, filtrado en memoria por `q` sin peticiones de red adicionales, apertura del cronograma, modal de edición y diálogo de eliminación; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T9: Montaje en Ruta `/expenses` con Límite de `Suspense` y App Shell (TDD)
- **RFs cubiertos:** RF-01, RF-02
- **Archivos involucrados:**
  - `src/app/(main)/expenses/page.tsx`
  - `src/app/(main)/expenses/page.test.tsx`
- **Descripción:**
  Implementar la página principal de compras en `src/app/(main)/expenses/page.tsx`:
  1. Estructura la cabecera de la vista con título *"Compras y Cuotas"* y descripción contextual.
  2. Envuelve el componente cliente `ExpensesView` dentro de un `<Suspense>` boundary con esqueleto de carga para garantizar compatibilidad con `useSearchParams()` en Next.js 15 App Router sin advertencias de desoptimización.
  3. Escribir pruebas unitarias en `page.test.tsx` verificando el renderizado de la estructura principal.
- **Hecho cuando:**
  `npx vitest run src/app/\(main\)/expenses/page.test.tsx` pasa en verde probando montaje en ruta protegida con Suspense boundary para searchParams, título "Compras y Cuotas" y renderizado de `ExpensesView`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T10: Suite de Integración End-to-End, Resiliencia de Concurrencia y Verificación Global
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06
- **Archivos involucrados:**
  - `src/features/expenses/expenses-flow.test.tsx`
- **Descripción:**
  Crear una suite de pruebas de integración completa simulando los flujos de usuario reales de la Spec 005:
  1. Flujo 1: Exploración del catálogo cronológico de compras con tarjetas, divisas y participantes.
  2. Flujo 2: Aplicación combinada de filtros (`period=2026-11` mapeado a `active_in_period`) y búsqueda textual en memoria `q`.
  3. Flujo 3: Apertura del cronograma de amortización al vuelo, renderizado de cuotas, fechas deterministas y resaltado literal de período.
  4. Flujo 4: Edición de un gasto con sanitización de splits (descarte de `id`, `created_at`, `updated_at`), normalización a `null`, despacho de `PUT` e invalidación en cascada.
  5. Flujo 5: Eliminación de un gasto con confirmación `AlertDialog` y recuperación elegante ante `404 Not Found` por eliminación concurrente previa.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/expenses-flow.test.tsx` pasa en verde al 100%; `npx vitest run` ejecuta toda la suite del proyecto en verde; `npx tsc --noEmit` y `npm run lint` reportan 0 errores y 0 advertencias.
