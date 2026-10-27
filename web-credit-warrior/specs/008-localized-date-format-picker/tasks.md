# Tareas de Implementación 008 — Selector de Fecha Localizado en Formato DD/MM/AAAA (`008-localized-date-format-picker`)

- **Estado:** completada
- **Versión:** 1.0.0
- **Fecha:** 2026-10-22
- **Plan Técnico:** [`specs/008-localized-date-format-picker/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/008-localized-date-format-picker/plan.md)
- **Especificación Relacionada:** [`specs/008-localized-date-format-picker/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/008-localized-date-format-picker/spec.md) (v1.0.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T4)

### [x] T1: Utilidades Puras de Formateo, Máscara y Validación Civil `date-format.ts` (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01, RF-02, RF-05
- **Archivos involucrados:**
  - `src/lib/date-format.ts` (nuevo)
  - `src/lib/date-format.test.ts` (nuevo)
- **Descripción:**
  Implementar mediante TDD la suite de utilidades puras de fecha civil:
  1. `isLeapYear(year)`: evalúa si un año es bisiesto de forma determinista `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.
  2. `getDaysInMonth(month, year)`: retorna el total exacto de días (28/29 para febrero, 30 para meses de 30 días, 31 para meses de 31 días).
  3. `isValidCivilDate(day, month, year)`: valida que el año se encuentre entre `1900` y `2100`, mes entre `1` y `12`, y día entre `1` y `maxDays`.
  4. `parseIsoToDisplay(isoDate)`: convierte `"YYYY-MM-DD"` a `"DD/MM/AAAA"` mediante descomposición de componentes numéricos sin constructores `Date` de JS.
  5. `parseDisplayToIso(displayDate)`: convierte `"DD/MM/AAAA"` a `"YYYY-MM-DD"` si es una fecha civil válida; de lo contrario retorna `null`.
  6. `formatDateMask(input, previousValue)`: filtra caracteres no numéricos, trunca a 8 dígitos e inserta dinámicamente las barras separadoras `/` tras el día y el mes, soportando retrocesos naturales (*Backspace*).
  7. `normalizePastedDate(pasted)`: detecta y normaliza fechas pegadas en formatos `DD/MM/AAAA`, `DD-MM-AAAA` o `YYYY-MM-DD`.
- **Hecho cuando:**
  `npx vitest run src/lib/date-format.test.ts` pasa en verde con pruebas completas de años bisiestos (29/02/2024 válido vs 29/02/2026 inválido), meses de 30 vs 31 días, inserción de barras `/`, borrado de caracteres, pegado y conversiones bidireccionales; `tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Componente `QuickDatePicker` con Entrada `DD/MM/AAAA`, Máscara Dinámica y Atajos Táctiles (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-01, RF-02, RF-04, RF-05, RF-06
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-date-picker.tsx` (modificado)
  - `src/features/expenses/components/quick-date-picker.test.tsx` (modificado)
- **Descripción:**
  Actualizar mediante TDD el componente `QuickDatePicker`:
  1. Reemplazar el input nativo por un input de texto controlado: `type="text"`, `inputMode="numeric"`, `placeholder="DD/MM/AAAA"`, `maxLength={10}`.
  2. Mantener un estado local `displayValue` sincronizado con la prop `value` (en ISO `YYYY-MM-DD`).
  3. Al escribir dígitos, aplicar `formatDateMask` para formatear en tiempo real. Si la fecha completada conforma una fecha civil válida, invocar `onChange(isoDate)` emitiendo `YYYY-MM-DD`.
  4. Los botones de atajo táctil "Hoy" y "Ayer" asignan la fecha civil local en `DD/MM/AAAA` al campo visual y emiten `YYYY-MM-DD` a `onChange`, marcando `aria-pressed="true"` cuando corresponda.
  5. Manejo de desenfoque (`onBlur`): si el usuario deja una fecha incompleta o imposible (ej. `"31/02/2026"`), activa `aria-invalid="true"`, asigna borde en `#F43F5E` y muestra mensaje de error accesible con `role="alert"`.
  6. Soporte completo de la propiedad `disabled`.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-date-picker.test.tsx` pasa en verde probando que el valor visual siempre muestra `DD/MM/AAAA`, la máscara dinámica opera al escribir por teclado, los atajos Hoy y Ayer funcionan en un toque emitiendo ISO, y el manejo de errores en `onBlur` cumple con accesibilidad WAI-ARIA; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Selector Gráfico de Calendario Integrado y Sincronizado en `QuickDatePicker` (TDD)
- **Tipo:** TDD
- **RFs cubiertos:** RF-03, RF-05
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-date-picker.tsx` (modificado)
  - `src/features/expenses/components/quick-date-picker.test.tsx` (modificado)
- **Descripción:**
  Integrar mediante TDD el selector gráfico de calendario en `QuickDatePicker`:
  1. Incorporar un botón interactivo con icono `Calendar` fijado en el extremo derecho del contenedor del input con `aria-label="Abrir calendario"` y área de contacto mínima de `44x44px`.
  2. Ubicar un input auxiliar `<input type="date" tabIndex={-1} aria-hidden="true" className="sr-only" />` sincronizado con el valor ISO actual.
  3. Al pulsar el botón de calendario, disparar `hiddenDateInputRef.current?.showPicker?.()` (con fallback a `click()` y `focus()`).
  4. Al seleccionar una fecha en el calendario del sistema, el evento `change` del input auxiliar actualiza `displayValue` al formato `DD/MM/AAAA` y llama a la prop `onChange(isoDate)`.
  5. Preservar la navegación por teclado y el foco accesible al interactuar y cerrar el calendario.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-date-picker.test.tsx` pasa en verde probando la presencia del botón de calendario accesible, la invocación de `showPicker()`, la sincronización bidireccional entre la selección gráfica y el campo de texto `DD/MM/AAAA`, y la emisión de `YYYY-MM-DD`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Integración en `QuickExpenseForm` y Suite de Pruebas de Regresión E2E
- **Tipo:** TDD / Integración
- **RFs cubiertos:** RF-01 a RF-06
- **Archivos involucrados:**
  - `src/features/expenses/components/quick-expense-form.test.tsx` (modificado)
  - `src/features/expenses/components/quick-expense-flow.test.tsx` (verificado)
- **Descripción:**
  Verificar la integración completa en el flujo de captura rápida de gastos:
  1. Comprobar que `QuickExpenseForm` opera de forma transparente con React Hook Form, recibiendo la fecha en `purchase_date` en formato ISO `YYYY-MM-DD` sin requerir modificaciones en los esquemas Zod (`expenseCreateSchema`).
  2. Simular el registro de un gasto con fecha escrita manualmente en `DD/MM/AAAA` (ej. `"22/10/2026"`), verificando que la petición despachada al backend contiene `purchase_date: "2026-10-22"`.
  3. Simular la selección de fecha mediante atajo "Hoy" y selector gráfico en el modal `QuickExpenseDrawer`.
  4. Ejecución de la suite completa de pruebas del proyecto (`npm test`) y validación estricta de linters y compilación de TypeScript.
- **Hecho cuando:**
  `npx vitest run src/features/expenses/components/quick-expense-form.test.tsx src/features/expenses/quick-expense-integration.test.tsx` pasa en verde; la suite completa de pruebas (`npm test`) pasa al 100%; `npm run build`, `npm run lint` y `npm run typecheck` completan con 0 errores y 0 advertencias.
