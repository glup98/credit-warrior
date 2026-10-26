# Tareas de Implementación 006 — Panel Financiero Principal, Resumen Mensual y Proyecciones (`006-dashboard-and-projections`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-21
- **Plan Técnico:** [`specs/006-dashboard-and-projections/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/006-dashboard-and-projections/plan.md)
- **Especificación Relacionada:** [`specs/006-dashboard-and-projections/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/006-dashboard-and-projections/spec.md) (v1.1.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T10)

### [x] T1: Utilidades Deterministas de Período `date-period.ts` y Esquemas Zod (TDD)
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - `src/lib/date-period.ts`
  - `src/lib/date-period.test.ts`
  - `src/schemas/dashboard.schema.ts`
  - `src/schemas/dashboard.schema.test.ts`
- **Descripción:**
  Implementar mediante TDD las utilidades de navegación temporal y esquemas Zod estrictos:
  1. `isValidPeriod(period)`: valida si el string cumple estrictamente con `^\d{4}-(0[1-9]|1[0-2])$`.
  2. `getNextPeriod(period)` y `getPreviousPeriod(period)`: implementan aritmética entera pura sobre componentes numéricos con desbordamiento de año (mes 12 a mes 01 con año + 1; mes 01 a mes 12 con año - 1). Prohíbe el uso de `Date` de JavaScript para evitar desfases de husos horarios UTC negativos.
  3. `periodStringSchema`, `dashboardSummaryParamsSchema` y `dashboardProjectionParamsSchema` con `.strict()`.
- **Hecho cuando:**
  `npx vitest run src/lib/date-period.test.ts src/schemas/dashboard.schema.test.ts` pasa en verde con pruebas completas de desbordamiento de fin de año, rechazo de períodos inválidos (mes 13, mes 00, cadenas arbitrarias) y esquemas Zod estrictos; `tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Selector de Período `PeriodSelector` con Navegación y Sincronización en URL (TDD)
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - `src/features/dashboard/components/period-selector.tsx`
  - `src/features/dashboard/components/period-selector.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `PeriodSelector`:
  1. Renderiza los controles de navegación temporal con botones accesibles `<` y `>` con área de toque mínima de `44x44px`.
  2. Muestra la etiqueta central destacada con el nombre del mes y año en español usando `formatPeriod(currentPeriod, 'full')` (ej. *"Noviembre 2026"*).
  3. Muestra el botón de atajo *"Próximo vencimiento"* cuando el período visualizado difiere del período por defecto provisto por la API, permitiendo regresar en un solo toque.
  4. Llama a `onPeriodChange` con el nuevo período calculado deterministamente al accionar los botones de mes o el atajo.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/period-selector.test.tsx` pasa en verde probando navegación anterior/siguiente, formateo legible en español, aparición y click del botón de atajo *"Próximo vencimiento"*, y accesibilidad de botones; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Tarjetas de Resumen Financiero Clave `CurrencyKpiCards` (TDD)
- **RFs cubiertos:** RF-02
- **Archivos involucrados:**
  - `src/features/dashboard/components/currency-kpi-cards.tsx`
  - `src/features/dashboard/components/currency-kpi-cards.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `CurrencyKpiCards`:
  1. Tarjeta `CLP`: borde e indicador semántico Emerald (`#10B981`), concepto *"Total a pagar CLP"*, monto total formateado en cifras tabulares monoespaciadas (`formatCurrency`) y contador de cuotas activas derivado de `active_installments.filter(i => i.currency === 'CLP').length`.
  2. Tarjeta `USD`: borde e indicador semántico Cyan (`#38BDF8`), concepto *"Total a pagar USD"*, monto total formateado con dos decimales tabulares (`formatCurrency`) y contador de cuotas activas derivado de `active_installments.filter(i => i.currency === 'USD').length`.
  3. Manejo de saldo cero: si el total es `"0"`, `"0.00"` o no hay cuotas, muestra `$0` / `US$0.00` con tipografía neutral y texto indicativo de *"0 compromisos pendientes"*.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/currency-kpi-cards.test.tsx` pasa en verde probando renderizado de ambas monedas, formateo tabular, contador derivado exacto y representación neutral de montos en cero; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Desglose Consolidado por Participante `PersonBreakdownSection` (TDD)
- **RFs cubiertos:** RF-03
- **Archivos involucrados:**
  - `src/features/dashboard/components/person-breakdown-section.tsx`
  - `src/features/dashboard/components/person-breakdown-section.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `PersonBreakdownSection` ("Cuánto Paga Cada Uno"):
  1. Itera sobre `by_person: PersonMonthlySummary[]`.
  2. Cruza `person_id` con el mapa de personas provisto para resolver el color característico `color_hex`, aplicando un color neutro de respaldo (`#8A93A6`) si la persona no está en el catálogo o carece de color.
  3. Muestra avatar/dot con el color de la persona, nombre completo y los montos adeudados en `CLP` y `USD` alineados verticalmente en números tabulares (`tabular-nums`).
  4. Omite o muestra guion para divisas donde la persona no registra deuda en el mes.
  5. Si la lista está vacía o ningún participante tiene deuda, expone un estado informativo amigable.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/person-breakdown-section.test.tsx` pasa en verde probando resolución de color desde el catálogo, color de respaldo, formateo multimoneda en números tabulares y estado vacío sin deuda; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T5: Desglose de Compromisos por Tarjeta de Crédito `CardBreakdownSection` (TDD)
- **RFs cubiertos:** RF-04
- **Archivos involucrados:**
  - `src/features/dashboard/components/card-breakdown-section.tsx`
  - `src/features/dashboard/components/card-breakdown-section.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `CardBreakdownSection` ("Estado por Tarjeta"):
  1. Itera sobre `by_card: CardMonthlySummary[]`.
  2. Cruza `card_id` con el mapa de tarjetas provisto para resolver `last_four_digits` (`•••• 1234`) y el estado de vigencia `is_active`.
  3. Si la tarjeta está archivada (`is_active === false`), despliega una píldora visible de *"Archivada"*. Si no tiene últimos 4 dígitos, omite limpiamente la máscara.
  4. Muestra las fechas del ciclo bancario en formato determinista con `formatDate`: Fecha de corte (`closing_date`) y Fecha de vencimiento (`due_date`).
  5. Muestra el total adeudado en la tarjeta (`total_due`) y el sub-desglose por persona (`by_person` de la tarjeta) con el importe exacto a transferir para esa tarjeta.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/card-breakdown-section.test.tsx` pasa en verde probando cruce de máscara, indicador de tarjeta archivada, fechas deterministas sin desfase UTC y sub-desglose por persona; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T6: Listado de Cuotas Activas `ActiveInstallmentsSection` con Integración de Cronograma (TDD)
- **RFs cubiertos:** RF-05
- **Archivos involucrados:**
  - `src/features/dashboard/components/active-installments-section.tsx`
  - `src/features/dashboard/components/active-installments-section.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `ActiveInstallmentsSection` ("Cuotas Activas del Período"):
  1. Itera sobre `active_installments: ActiveInstallmentItem[]`.
  2. Renderiza la ficha de cada compromiso: concepto comercial, nombre de tarjeta con últimos 4 dígitos resueltos, divisa (`CurrencyBadge`), cuota actual sobre total (ej. `1/3`), monto mensual tabular y desglose de participantes (`person_shares`).
  3. Incluye un botón explícito e independiente *"Ver cronograma"* accesible por puntero y teclado (sin anidamiento inválido en el DOM).
  4. Al pulsar *"Ver cronograma"*, abre el componente `ExpenseScheduleDrawer` reutilizado, pasando `expenseId={item.expense_id}` y `activePeriod={currentPeriod}` para resaltar contextualmente la fila de la cuota en curso.
  5. Restaura el foco accesible al botón activador al cerrar el panel.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/active-installments-section.test.tsx` pasa en verde probando renderizado de cuotas, apertura de `ExpenseScheduleDrawer` con `activePeriod`, ausencia de botones anidados y foco accesible; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T7: Gráfico Interactivo de Proyección Multimoneda `ProjectionChart` con Recharts (TDD)
- **RFs cubiertos:** RF-06
- **Archivos involucrados:**
  - `package.json` (instalación de dependencia `recharts`)
  - `src/features/dashboard/components/projection-chart.tsx`
  - `src/features/dashboard/components/projection-chart.test.tsx`
- **Descripción:**
  Implementar mediante TDD el gráfico de barras apiladas a 6 meses `ProjectionChart`:
  1. Instalar `recharts` en el proyecto (`npm install recharts`).
  2. Selector accesible de divisa para alternar entre `CLP` y `USD`.
  3. Mapea los 6 períodos de `DashboardProjectionResponse`: para cada mes, agrupa los montos por participante.
  4. Delimitación estricta de precisión: convierte montos a `Number(amount)` exclusivamente para el layout de coordenadas SVG de `<Bar stackId="a" dataKey={personId} fill={personColor} />`.
  5. Segmenta las barras apiladas según el `color_hex` de cada persona resuelto del catálogo.
  6. Tooltip interactivo flotante accesible: preserva y formatea los montos en cadenas de texto (`string`) usando `formatCurrency` y números tabulares.
  7. Interacción de selección temporal: al hacer clic en una barra, invoca `onSelectPeriod(period)` para actualizar la URL y el Dashboard al mes correspondiente.
  8. Estado vacío informativo si durante los 6 meses todos los totales proyectados son cero en la divisa seleccionada.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/projection-chart.test.tsx` pasa en verde probando instalación de Recharts, selector de moneda, barras apiladas con colores de personas, conversión delimitada a `Number` para SVG, tooltip con strings formateados, clic en barra y estado vacío en cero; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T8: Esqueletos de Carga Estructurados `DashboardSkeletons` (TDD)
- **RFs cubiertos:** RF-07
- **Archivos involucrados:**
  - `src/features/dashboard/components/dashboard-skeletons.tsx`
  - `src/features/dashboard/components/dashboard-skeletons.test.tsx`
- **Descripción:**
  Implementar mediante TDD los esqueletos visuales estructurados `DashboardSkeletons`:
  1. Contenedores con dimensiones mínimas predeterminadas (`min-h-[...]`) que replican la geometría exacta del selector de período, tarjetas KPI multimoneda, desgloses por persona/tarjeta, lista de cuotas y gráfico de proyección.
  2. Animación de pulso discreta y colores adaptados a la superficie oscura (`bg-elevated/60`, `bg-elevated/80`).
  3. Garantiza estabilidad visual estricta para erradicar cambios acumulativos de diseño (CLS < 0.05).
  4. Atributos de accesibilidad con `role="status"` y `aria-busy="true"`.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/components/dashboard-skeletons.test.tsx` pasa en verde verificando estructura geométrica de skeletons, atributos accesibles y ausencia de overflow; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T9: Coordinador de Vista `DashboardView` con Gestión de Resiliencia, Normalización y Acciones (TDD)
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07
- **Archivos involucrados:**
  - `src/features/dashboard/dashboard-view.tsx`
  - `src/features/dashboard/dashboard-view.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente orquestador `DashboardView`:
  1. Lee el parámetro de consulta `period` de la URL mediante `useSearchParams()`.
  2. Valida el parámetro con `isValidPeriod`: si está ausente o es inválido, consulta `useDashboardSummary(undefined)` para obtener el período sugerido del backend. Al responder, sincroniza la URL con `router.replace('?period=' + data.period, { scroll: false })`.
  3. Ejecuta en paralelo las consultas `useDashboardProjection({ start_period: activePeriod, months: 6 })`, `useCards()` y `usePersons()`.
  4. Crea mapas en memoria de personas y tarjetas para inyectar metadatos (`color_hex`, `last_four_digits`, `is_active`) a las secciones hijas.
  5. Resiliencia de red: si la consulta de resumen falla (`isError`), expone una tarjeta de alerta accesible con mensaje descriptivo y botón funcional de *"Reintentar"*.
  6. Estado vacío general: si el período registra deuda cero en todas las monedas y no hay cuotas activas, presenta un estado informativo con botón CTA *"Registrar compra"* que dispara `useQuickExpense().open()`.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/dashboard-view.test.tsx` pasa en verde probando orquestación de queries, normalización de períodos malformados en URL, resolución cruzada de metadatos, estado de error con reintento y estado vacío con activación de `QuickExpenseDrawer`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T10: Montaje en Ruta Raíz `src/app/(main)/page.tsx` con `<Suspense>`, Verificación PWA y Test de Integración E2E
- **RFs cubiertos:** RF-01 a RF-07
- **Archivos involucrados:**
  - `src/app/(main)/page.tsx`
  - `src/features/dashboard/dashboard-integration.test.tsx`
- **Descripción:**
  Reemplazar la página inicial de demostración por la integración completa del Dashboard en la ruta raíz:
  1. Envolver `DashboardView` dentro de un límite `<Suspense fallback={<DashboardSkeletons />}>` en `src/app/(main)/page.tsx`, asegurando compatibilidad total con la lectura de `useSearchParams()` en Next.js 15 App Router.
  2. Implementar suite de integración E2E `dashboard-integration.test.tsx` simulando el ciclo de vida completo:
     - Carga inicial sin parámetros -> adopción de período por defecto y sincronización en URL.
     - Navegación temporal con botones `<` y `>` y retorno con *"Próximo vencimiento"*.
     - Alternancia de moneda en gráfico Recharts y clic en barra futura para cambiar de período.
     - Clic en *"Ver cronograma"* de una cuota activa y verificación de apertura del drawer con cuota vigente resaltada.
     - Verificación del CTA de registro rápido en meses vacíos.
  3. Verificación de PWA (`app/manifest.ts` y Service Worker) y validación final de tipos y linters.
- **Hecho cuando:**
  `npx vitest run src/features/dashboard/dashboard-integration.test.tsx` pasa en verde; la suite completa de pruebas del proyecto (`npm test`) pasa al 100%; `npm run build`, `npm run lint` y `npm run typecheck` completan con 0 errores y 0 advertencias.
