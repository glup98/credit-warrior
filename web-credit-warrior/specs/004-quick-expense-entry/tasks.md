# Tareas de Implementación 004 — Registro Ultra-Rápido de Gastos: Drawer Global, Adaptación de Moneda y Constructor de Repartos (`004-quick-expense-entry`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Plan Técnico:** [`specs/004-quick-expense-entry/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/004-quick-expense-entry/plan.md)
- **Especificación Relacionada:** [`specs/004-quick-expense-entry/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/004-quick-expense-entry/spec.md) (v1.1.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T10)

### [x] T1: Primitiva UI `Textarea` y Contexto Global `QuickExpenseContext` con Hook de Atajo de Teclado (TDD)
- **RFs cubiertos:** RF-01, RF-04
- **Archivos involucrados:**
  - `src/components/ui/textarea.tsx`
  - `src/components/ui/textarea.test.tsx`
  - `src/features/expenses/context/quick-expense-context.tsx`
  - `src/features/expenses/context/quick-expense-context.test.tsx`
  - `src/features/expenses/hooks/use-quick-expense-keyboard.ts`
  - `src/features/expenses/hooks/use-quick-expense-keyboard.test.ts`
- **Descripción:**
  1. Implementar la primitiva accesible `Textarea` en `src/components/ui/textarea.tsx` con estilos Dark Mode (`#12141C` surface, `#232736` border, `#F3F5F8` text), soporte de estado de error (`#F43F5E`) y pruebas unitarias.
  2. Implementar `QuickExpenseContext` y su proveedor `QuickExpenseProvider` exponiendo `{ isOpen, open, close }` para controlar la visibilidad del modal desde cualquier punto de la aplicación.
  3. Implementar el hook `useQuickExpenseKeyboard` que escucha `keydown` para los atajos `Alt+N` o pulsación de `N`, aplicando la regla estricta de exclusión de foco: no se activa si el elemento enfocado es un `input`, `textarea`, `select` o tiene `isContentEditable`.
- **Hecho cuando:**
  `npx vitest run src/components/ui/textarea.test.tsx src/features/expenses/context/quick-expense-context.test.tsx src/features/expenses/hooks/use-quick-expense-keyboard.test.ts` pasa en verde con Vitest probando renderizado de `Textarea`, apertura/cierre del contexto y disparo selectivo del atajo excluyendo elementos editables; `tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Selector de Tarjetas Activas y Adaptación de Moneda `CardSelectChips` (TDD)
- **RFs cubiertos:** RF-02
- **Archivos involucrados:**
  - `src/features/expenses/components/card-select-chips.tsx`
  - `src/features/expenses/components/card-select-chips.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `CardSelectChips` para selección horizontal táctil de tarjetas:
  1. Consume `useCards({ is_active: true })` para listar exclusivamente tarjetas activas.
  2. Cada ficha visual muestra el nombre de la tarjeta, últimos 4 dígitos enmascarados (`•••• 1234`) y `CurrencyBadge` (`CLP` o `USD`).
  3. Preselecciona automáticamente la tarjeta si existe una sola tarjeta activa registrada.
  4. Si no existen tarjetas activas, renderiza el banner orientativo con botón directo *"Ir a Tarjetas"* (`/cards`).
  5. Al cambiar entre tarjetas de distinta moneda (`CLP` <-> `USD`), detecta si existían montos ingresados para limpiarlos a cadena vacía `""` y emitir una notificación toast sutil (*"Moneda cambiada a [USD/CLP]: se restablecieron los montos para evitar discrepancias de escala"*).
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/card-select-chips.test.tsx` pasa en verde probando filtrado de activas, preselección automática, detección de cambio de divisa con aviso de reseteo y estado vacío ante 0 tarjetas; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Selector de Reparto Equitativo y Estado Vacío de Participantes `ExpenseSplitBuilder` en Modo `EQUAL` (TDD)
- **RFs cubiertos:** RF-05, RF-06
- **Archivos involucrados:**
  - `src/features/expenses/components/expense-split-builder.tsx`
  - `src/features/expenses/components/expense-split-builder.test.tsx`
- **Descripción:**
  Implementar mediante TDD el contenedor base `ExpenseSplitBuilder` y su comportamiento en modo `EQUAL`:
  1. Renderiza selector de pestañas (`Tabs`) para alternar entre `EQUAL`, `PERCENTAGE` y `FIXED_AMOUNT`.
  2. Consume `usePersons({ is_active: true })`. Si no existen participantes activos (`activePersonsCount === 0`), muestra un mensaje orientativo con botón directo *"Crear participante"* (`/persons`) y desactiva el guardado.
  3. En modo `EQUAL`, preselecciona a todos los participantes activos usando `PersonChip`. Permite activar o desactivar participantes mediante toques directos.
  4. Garantiza que en modo `EQUAL` no se muestren cajas de entrada numéricas por persona y que el cálculo referencial estime la cuota por persona con aclaración de que el ajuste de residuos lo realiza el servidor.
  5. Asegura que al menos 1 participante quede seleccionado; si se desmarcan todos, alerta visualmente sobre la restricción `splits.minItems: 1`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/expense-split-builder.test.tsx` pasa en verde verificando pestañas, preselección en EQUAL, ausencia de inputs numéricos en EQUAL, banner orientativo ante 0 participantes y validación de mínimo 1 persona; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Balanceador Porcentual `PercentageSplitBalance` e Inicialización Asistida al 100% en Modo `PERCENTAGE` (TDD)
- **RFs cubiertos:** RF-05, RF-07
- **Archivos involucrados:**
  - `src/features/expenses/components/percentage-split-balance.tsx`
  - `src/features/expenses/components/percentage-split-balance.test.tsx`
  - `src/features/expenses/components/expense-split-builder.tsx`
- **Descripción:**
  Implementar mediante TDD la vista y controles del modo `PERCENTAGE`:
  1. Componente `PercentageSplitBalance`: Despliega la barra de progreso en vivo y calcula en centésimas enteras la suma acumulada:
     - Suma < 100.00%: Barra en ámbar (`#F59E0B`) con porcentaje asignado y restante por distribuir.
     - Suma > 100.00%: Barra en rojo (`#F43F5E`) alertando sobre el exceso.
     - Suma === 100.00%: Barra en verde esmeralda (`#10B981`) indicando *"Balanceado: 100.00%"*.
  2. Botón accesible de utilidad *"Distribuir equitativo"* que divide automáticamente el 100% en partes iguales entre los participantes activos seleccionados (ej. `33.34%`, `33.33%`, `33.33%` para 3 personas).
  3. **Inicialización Asistida**: Al conmutar de `EQUAL` a `PERCENTAGE`, dispara la auto-distribución equitativa para que el formulario comience directamente en verde al 100.00%.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/percentage-split-balance.test.tsx` pasa en verde probando estados cromáticos de balance en centésimas enteras, cálculo de distribución equitativa e inicialización asistida al 100%; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T5: Balanceador de Monto Fijo `FixedSplitBalance` y Asignación Rápida de Saldo Restante en Modo `FIXED_AMOUNT` (TDD)
- **RFs cubiertos:** RF-05, RF-08
- **Archivos involucrados:**
  - `src/features/expenses/components/fixed-split-balance.tsx`
  - `src/features/expenses/components/fixed-split-balance.test.tsx`
  - `src/features/expenses/components/expense-split-builder.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `FixedSplitBalance` para el modo `FIXED_AMOUNT`:
  1. Entrada de montos por participante en la divisa de la tarjeta seleccionada (`$` o `US$`).
  2. Cálculo en centavos enteros de la diferencia entre `total_amount` y la suma de `fixed_amount`:
     - Restante > 0: Indicador ámbar con el saldo pendiente por asignar.
     - Suma > total: Indicador rojo con el monto excedido.
     - Suma === total: Indicador verde *"Total cubierto exactamente"*.
  3. Botón de utilidad sutil *"Asignar restante"* en cada fila de participante: al ser pulsado, suma el saldo no asignado directamente al campo del participante en foco, llevando el restante a `$0` en un solo toque.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/fixed-split-balance.test.tsx` pasa en verde probando cálculo reactivo de restante en centavos, acción del botón *"Asignar restante"* y estados visuales ámbar/rojo/verde; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T6: Atajos Rápidos de Fecha, Selector Táctil de Cuotas y Opciones Avanzadas de Facturación (TDD)
- **RFs cubiertos:** RF-03, RF-04
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-date-picker.tsx`
  - `src/features/expenses/components/quick-date-picker.test.tsx`
  - `src/features/expenses/components/installments-selector.tsx`
  - `src/features/expenses/components/installments-selector.test.tsx`
- **Descripción:**
  Implementar componentes de captura ergonómica de parámetros de compra:
  1. `QuickDatePicker`: Control de fecha con atajos táctiles de un solo toque:
     - Botón *"Hoy"*: Asigna la fecha local actual en formato `YYYY-MM-DD`.
     - Botón *"Ayer"*: Asigna la fecha del día anterior (`subDays(new Date(), 1)`).
     - Selector de calendario accesible para fechas personalizadas.
  2. `InstallmentsSelector`: Selector segmentado con accesos rápidos para `1` (Al contado), `3`, `6`, `12` cuotas y campo numérico para ingreso manual `1..120`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-date-picker.test.tsx src/features/expenses/components/installments-selector.test.tsx` pasa en verde probando atajos táctiles de fecha *"Hoy"* y *"Ayer"*, selección rápida de cuotas y validación de rango `1..120`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T7: Orquestador del Formulario `QuickExpenseForm`: Limpieza de Payload, Anti Double-Submit y Mapeo `422` (TDD)
- **RFs cubiertos:** RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-expense-form.tsx`
  - `src/features/expenses/components/quick-expense-form.test.tsx`
- **Descripción:**
  Construir el formulario principal `QuickExpenseForm` integrando React Hook Form con `expenseCreateSchema`:
  1. Orquesta los campos: `card_id`, `description`, `total_amount`, `purchase_date`, `installments_count`, acordeón de opciones avanzadas (`first_billing_override`, `notes`) y `ExpenseSplitBuilder`.
  2. Implementa la función de limpieza `cleanExpensePayload`:
     - Normaliza cadenas vacías en `first_billing_override` y `notes` a `null`.
     - En modo `EQUAL`, envía `percentage: null` y `fixed_amount: null`.
     - En modo `PERCENTAGE`, envía `fixed_amount: null`.
     - En modo `FIXED_AMOUNT`, envía `percentage: null`.
  3. Bloqueo anti double-submit con spinner de carga durante la mutación `useCreateExpense`.
  4. Mapeo inline de errores `422` de Pydantic con `mapPydanticErrorsToForm`, inyectando mensajes bajo los campos o splits correspondientes sin cerrar el formulario.
  5. Manejo de error `404` por concurrencia con toast informativo e invalidación silenciosa de tarjetas/personas.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-expense-form.test.tsx` pasa en verde validando normalización a `null`, envío limpio a `useCreateExpense`, anti double-submit, mapeo inline de errores `422` y resiliencia ante `404`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T8: Modal Adaptativo `QuickExpenseDrawer` con Protección Anti Cierre Accidental (TDD)
- **RFs cubiertos:** RF-01, RF-10
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-expense-drawer.tsx`
  - `src/features/expenses/components/quick-expense-drawer.test.tsx`
- **Descripción:**
  Implementar el contenedor responsivo `QuickExpenseDrawer` conectado a `QuickExpenseContext`:
  1. En móvil (`< 768px`): Renderiza `Drawer` (Vaul) con arrastre hacia abajo, safe areas y ajuste a teclado virtual (`100dvh`).
  2. En escritorio (`>= 768px`): Renderiza `Dialog` centrado accesible con backdrop blur.
  3. **Protección Anti Cierre Accidental**: Si el formulario contiene datos ingresados (`isDirty`: monto > 0 o descripción con texto), deshabilita el despido por toque exterior en el backdrop (`dismissible={false}` condicional en Vaul), obligando a pulsar *"Cancelar"* para descartar los datos.
  4. **Resiliencia ante Fallos de Red**: Si la mutación falla por desconexión o error `500`, el modal **permanece abierto** con todos los datos intactos para permitir reintento inmediato.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-expense-drawer.test.tsx` pasa en verde probando renderizado adaptativo Dialog/Drawer, comportamiento de `dismissible` condicional a `isDirty`, y preservación del formulario ante errores de red; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T9: Conexión de Disparadores Globales en `BottomNav`, `DesktopSidebar`, `AppHeader` y Layout Principal (TDD)
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - `src/components/layout/bottom-nav.tsx`
  - `src/components/layout/desktop-sidebar.tsx`
  - `src/components/layout/app-header.tsx`
  - `src/app/(main)/layout.tsx`
  - `src/components/layout/navigation-triggers.test.tsx`
- **Descripción:**
  Conectar los disparadores del shell de la aplicación con `QuickExpenseContext`:
  1. Envolver el layout protegido `src/app/(main)/layout.tsx` con `QuickExpenseProvider` e inyectar el componente `<QuickExpenseDrawer />`.
  2. Actualizar el botón central destacado `+` en `BottomNav` para invocar `open()` del contexto en lugar del toast de desarrollo.
  3. Actualizar el botón primario *"Registrar gasto"* en `DesktopSidebar` para invocar `open()` del contexto.
  4. Añadir en `AppHeader` el botón secundario *"Registrar gasto"* visible en escritorio (`md:flex`) conectado a `open()`.
  5. Activar el hook `useQuickExpenseKeyboard` dentro del layout para habilitar el atajo `Alt+N`/`N` en toda la aplicación.
- **Hecho cuando:**
  `npx vitest run src/components/layout/navigation-triggers.test.tsx` pasa en verde probando que hacer clic en los disparadores de `BottomNav`, `DesktopSidebar` y `AppHeader` invoca `open()` abriendo el drawer; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T10: Pruebas de Integración End-to-End de Componente, Resiliencia de Red y Verificación Global
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-expense-flow.test.tsx`
- **Descripción:**
  Crear una suite de pruebas de integración completa simulando los flujos de usuario reales de la Spec 004:
  1. Flujo 1: Registro rápido móvil con tarjeta activa en CLP, 3 cuotas, participantes en EQUAL -> éxito `201` -> cierre de modal e invalidación de `expenses.all` y `dashboard.all`.
  2. Flujo 2: Registro en USD con cambio a modo `PERCENTAGE`, balanceo interactivo al 100% y distribución equitativa -> éxito `201`.
  3. Flujo 3: Registro en modo `FIXED_AMOUNT` con uso de *"Asignar restante"* hasta cubrir el total exacto.
  4. Flujo 4: Simulación de fallo de red en primer intento -> modal permanece abierto con datos intactos -> reintento exitoso al reanudar conexión.
  5. Flujo 5: Simulación de error `422` de Pydantic con inyección de mensaje inline bajo el campo observado.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-expense-flow.test.tsx` pasa en verde al 100%; `npx vitest run` ejecuta toda la suite del proyecto en verde; `npx tsc --noEmit` y `npm run lint` reportan 0 errores y 0 advertencias.
