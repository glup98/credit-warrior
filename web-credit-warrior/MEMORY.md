# MEMORY.md — Estado del Proyecto y Memoria Arquitectónica (`web-credit-warrior`)

Este archivo mantiene el estado vivo del desarrollo de **Credit Warrior Web**, el registro de decisiones arquitectónicas (ADRs), el estado de integración de los contratos de `api-credit-warrior` y el seguimiento de las especificaciones SDD (`specs/NNN-nombre`).

---

## 1. Estado Actual del Proyecto

- **Fase Actual**: **Fase 6 — Spec 009 Completada (8/8 tareas) — Gestión de Mantención de Tarjetas: Configuración Base, Sobreescrituras Mensuales y Transparencia en Dashboard**.
- **Próximo Paso**: Auditoría final y revisión de aceptación con `@reviewer`.
- **Código de Aplicación (`src/`)**: 
  - Scaffolding base Next.js 15 App Router, Tailwind CSS v4 Dark Mode, tipos OpenAPI 3.1.0 congelados, esquemas Zod `.strict()`, cliente HTTP `apiClient` (`ApiError`), servicios y hooks TanStack Query v5 para los 23 endpoints de `api-credit-warrior`.
  - Formateadores inmutables de moneda (`CLP`/`USD`), fechas en español y enmascaramiento estricto `•••• 1234`.
  - Primitivas UI accesibles (Radix UI / shadcn Dark Mode First): `Tabs`, `Dialog`, `Drawer`, `AlertDialog`, `DropdownMenu`, `Switch`, `Textarea`, `Badge`, `Button`, `Card`, `Input`, `Label`.
  - PWA instalable: `src/app/manifest.ts` standalone con tema `#090A0F` y Service Worker con `@serwist/next`.
  - Guardia de onboarding (`OnboardingGuard`) y Wizard `/onboarding` en 3 pasos con auto-redirección tras registrar primera tarjeta (con mantención base) y participantes.
  - App Shell responsivo: `DesktopSidebar` (desktop), `BottomNav` (mobile) con botón central Quick Expense `+`, `AppHeader` con badge de salud del backend.
  - Vistas de gestión `/cards` y `/persons` con modales adaptativos `Dialog`/`Drawer`, switch optimista `is_active`, selector cromático de persona y diálogo de archivado inteligente ante `409 Conflict`.
  - Gestión de Mantención de Tarjetas (Spec 009):
    - Campo `default_monthly_fee` en tarjetas con validación estricta por divisa (CLP entero no negativo vs USD hasta 2 decimales) y normalización automática de vacíos a `"0"`.
    - Visualización del costo base mensual en catálogo `CardItem` (`$4.500/mes` o `$0/mes`) y menú contextual con acción *"Gestionar mantención"*.
    - Componente adaptativo `CardFeesDialog` (`Dialog` en desktop `>= 768px` y `Drawer` en móvil `< 768px`) para consultar sobreescrituras mensuales, registrar tarifas promocionales vía `PUT /cards/{id}/fees/{period}` y eliminar excepciones vía `DELETE` restaurando la tarifa base.
    - Transparencia contable en `CardBreakdownSection` (Dashboard) exponiendo compras del mes (`purchases_total`), mantención mensual (`maintenance_fee`), regla de inactividad bancaria (`$0` con distintivo *"Sin mantención por inactividad"*) y sub-desglose por persona con compras propias (`purchases_amount`) y cuota de mantención (`fee_share`).
    - Suite de integración E2E `cards-maintenance-fees-integration.test.tsx` cubriendo creación, sobreescritura, reflejo en dashboard y eliminación de tarifas.
  - Flujo de registro rápido `QuickExpenseDrawer` accesible globalmente (atajos `Alt+N`/`N`, botón cabecera, bottom nav) con constructor de repartos `ExpenseSplitBuilder` en modos `EQUAL`, `PERCENTAGE` y `FIXED_AMOUNT` con cálculo en centavos enteros y botón *"Asignar restante"*.
  - Vista de historial `/expenses` con filtros en URL, edición `PUT`, eliminación optimista `DELETE`, modal de amortización de cuotas al vuelo `ExpenseScheduleDrawer` y suite E2E de concurrencia.
  - Centro de comando financiero `/` (Dashboard) montado en `src/app/(main)/page.tsx` con `<Suspense>` y `DashboardSkeletons`:
    - `PeriodSelector` sincronizado con URL y período por defecto del backend (`2026-11`), navegación temporal y botón *"Próximo vencimiento"*.
    - `CurrencyKpiCards` para `CLP` y `USD` con bordes de divisa semántica y conteo de cuotas activas.
    - `PersonBreakdownSection` (cuánto paga cada persona) y `CardBreakdownSection` (estado por tarjeta con transparencia contable y fechas de corte/vencimiento).
    - `ActiveInstallmentsSection` con acceso directo a `ExpenseScheduleDrawer` resaltando la cuota vigente (`Próximo pago`).
    - `ProjectionChart` a 6 meses con Recharts 3.x, barras apiladas por participante (`color_hex`), selector de divisa y botones de salto temporal.
    - Resiliencia ante fallos de red con alerta accesible y botón de reintento; zero-state amistoso en meses sin cobros con CTA para abrir `QuickExpenseDrawer`.
  - Sistema de Navegación Instantánea y Transiciones Suaves (Spec 007):
    - `TopProgressBar`: Barra superior acelerada por GPU (`scaleX` y `opacity`) en `fixed top-0` con gradiente semántico CLP/USD, glow luminiscente, interceptor síncrono a 0ms en fase de captura, temporizador orgánico y finalización reactiva a cambios de ruta.
    - Segmento de carga nativo `src/app/(main)/loading.tsx` con esqueletos anti-CLS y atributos `role="status"` y `aria-busy="true"`.
    - Precarga proactiva en TanStack Query (`prefetchNavigationTarget`) activada en `onTouchStart` (móvil) y `onMouseEnter`/`onFocus` (escritorio).
    - Activación optimista inmediata a 0ms (`pendingHref`) en `BottomNav` y `DesktopSidebar` con reconciliación de ruta y `prefetch={true}`.
    - Transición de página suave `PageTransition` mediante desvanecimiento de opacidad a 60 FPS con clave `pathname` y respeto estricto a `@media (prefers-reduced-motion: reduce)`.
  - Selector de Fecha Localizado en Formato DD/MM/AAAA (Spec 008):
    - `src/lib/date-format.ts` con utilidades puras de fecha civil sin constructores `Date` UTC (`isLeapYear`, `getDaysInMonth`, `isValidCivilDate`, `parseIsoToDisplay`, `parseDisplayToIso`, `formatDateMask`, `normalizePastedDate`).
    - `QuickDatePicker` con campo de texto enmascarado `DD/MM/AAAA`, `inputMode="numeric"`, `tabular-nums`, botón accesible de calendario con `showPicker()`, atajos de un toque "Hoy" y "Ayer" locales, y validación estricta de calendario civil al desenfocar (`onBlur`).
    - Integración transparente con `QuickExpenseForm` y React Hook Form emitiendo `purchase_date` en ISO `YYYY-MM-DD` preservando el contrato de la API.
  - Cobertura de pruebas completa y validada: **75 suites de prueba, 687 pruebas pasadas al 100%**, `npm run typecheck`, `npm run lint` y empaquetado de producción `npm run build` completados con 0 errores y 0 advertencias.
- **Backend (`api-credit-warrior`)**: Contrato congelado y documentado en `docs/openapi.json` (OpenAPI 3.1.0) y `docs/resume.md`, operando localmente en `http://127.0.0.1:8000`.

---

## 2. Registro de Decisiones Arquitectónicas (ADRs)

| ID | Decisión Arquitectónica | Justificación y Regla de Cumplimiento | Referencia |
| :--- | :--- | :--- | :--- |
| **ADR-01** | **Capa de Presentación Pura (Zero Financial Math on Client)** | El backend concentra el 100% de la lógica financiera, cálculo de períodos de facturación/pago al vuelo (*on-the-fly*) y absorción de residuos de redondeo en la cuota #1 (`1/N`) y el último participante. El frontend solo renderiza lo devuelto por `api-credit-warrior`. | `docs/constitution.md` §1, `docs/resume.md` §1 |
| **ADR-02** | **Inmutabilidad Monetaria Basada en `string`** | Para eliminar errores de punto flotante IEEE 754 en JavaScript, todos los montos y porcentajes (`total_amount`, `installment_amount`, `amount_due`, `total_due`, `percentage`, `fixed_amount`, `amount`) viajan, se validan y se almacenan como `string` (`"100000"`, `"33.34"`). El formateo (`Intl.NumberFormat`) es exclusivamente visual. | `docs/constitution.md` §1, §5 |
| **ADR-03** | **Validación Estricta con Zod `.strict()` y Aritmética Entera en Splits** | El backend utiliza Pydantic V2 con `extra="forbid"` (`additionalProperties: false`). Todo esquema Zod de entrada usa `.strict()`. La validación en vivo de sumas en `PERCENTAGE` (`100.00%`) y `FIXED_AMOUNT` (`=== total_amount`) convierte los strings a centavos/centésimas enteras (`toCents`) antes de sumar. | `docs/constitution.md` §5.1, §5.2 |
| **ADR-04** | **Separación de Estado: TanStack Query v5 + URL Search Params** | Prohibido usar stores globales (`Zustand`/`Redux`) para cachear datos del servidor. TanStack Query gestiona todo el estado remoto mediante la fábrica `queryKeys` (`src/lib/query-keys.ts`) con invalidación en cascada hacia `queryKeys.dashboard.all` tras cada mutación. Los filtros de UI viven en los query params de la URL. | `docs/constitution.md` §4 |
| **ADR-05** | **Estética Dark Mode First (Private Banking & Financial Terminal)** | Superficies oscuras de alto contraste (`--bg-canvas: #090A0F`, `--bg-surface: #12141C`, `--bg-elevated: #1A1D28`, `--border-subtle: #232736`), acentos semánticos por divisa (`#10B981` para `CLP`, `#38BDF8` para `USD`), color personalizado `color_hex` por `Person`, y tipografía `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`). | `docs/constitution.md` §3.1 |
| **ADR-06** | **Recuperación UX con Archivado Inteligente ante `409 Conflict`** | Cuando `DELETE /api/v1/cards/{id}` o `DELETE /api/v1/persons/{id}` responde `409 Conflict` por tener compras asociadas, se presenta un `AlertDialog` que ofrece archivar la entidad ejecutando `PATCH` con `{ "is_active": false }`. | `docs/constitution.md` §7.3 |
| **ADR-07** | **Mobile-First PWA, Sin Auth en MVP y Endurecimiento de Seguridad** | Instalable vía `@serwist/next` y `src/app/manifest.ts`. Sin pantallas de login en el MVP. Prohibido `dangerouslySetInnerHTML`/`innerHTML` y `alert()`/`confirm()`/`prompt()`. Enmascaramiento obligatorio `•••• 1234` para `last_four_digits`. Binding local exclusivo en `127.0.0.1`. | `docs/constitution.md` §1, §8 |

---

## 3. Mapa de Contratos del Backend (`docs/openapi.json`)

| Dominio | Método y Endpoint | Query / Path Params | Request Schema | Response Schema (Éxito / Error) | Servicio / Hook Objetivo | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `GET /health` | — | — | `200` `Record<string, string>` | `apiClient` / `useHealthCheck()` | Implementado y Probado (`001`) |
| **Cards** | `GET /api/v1/cards` | `is_active?: boolean`, `currency?: 'CLP' \| 'USD'` | — | `200` `CardRead[]` / `422` | `cardsService.list` / `useCards(filters)` | Implementado y Probado en UI (`001`, `002`, `003`) |
| **Cards** | `POST /api/v1/cards` | — | `CardCreate` (`.strict()`) | `201` `CardRead` / `422` | `cardsService.create` / `useCreateCard()` | Implementado y Probado en UI (`001`, `002`, `003`) |
| **Cards** | `GET /api/v1/cards/{card_id}` | `card_id: UUID` | — | `200` `CardRead` / `404` / `422` | `cardsService.getById` / `useCard(cardId)` | Implementado y Probado en UI (`001`, `003`) |
| **Cards** | `PATCH /api/v1/cards/{card_id}` | `card_id: UUID` | `CardUpdate` (`.strict()`) | `200` `CardRead` / `404` / `422` | `cardsService.update` / `useUpdateCard()` | Implementado y Probado en UI (`001`, `003`) |
| **Cards** | `DELETE /api/v1/cards/{card_id}` | `card_id: UUID` | — | `204 No Content` / `404` / `409` / `422` | `cardsService.remove` / `useDeleteCard()` | Implementado y Probado en UI (`001`, `003`) |
| **Cards** | `GET /api/v1/cards/{card_id}/fees` | `card_id: UUID` | — | `200` `CardMonthlyFeeResponse[]` / `404` / `422` | `cardsService.listFees` / `useCardFees(cardId)` | Implementado y Probado en UI (`009`) |
| **Cards** | `GET /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM` | — | `200` `CardMonthlyFeeResponse` / `404` / `422` | `cardsService.getFee` / `useCardFee(cardId, period)` | Implementado y Probado en UI (`009`) |
| **Cards** | `PUT /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM` | `CardMonthlyFeeCreateOrUpdate` (`.strict()`) | `200` `CardMonthlyFeeResponse` / `404` / `422` | `cardsService.setFee` / `useSetCardFee()` | Implementado y Probado en UI (`009`) |
| **Cards** | `DELETE /api/v1/cards/{card_id}/fees/{period}` | `card_id: UUID`, `period: YYYY-MM` | — | `204 No Content` / `404` / `422` | `cardsService.deleteFee` / `useDeleteCardFee()` | Implementado y Probado en UI (`009`) |
| **Persons** | `GET /api/v1/persons` | `is_active?: boolean` | — | `200` `PersonRead[]` / `422` | `personsService.list` / `usePersons(filters)` | Implementado y Probado en UI (`001`, `002`, `003`) |
| **Persons** | `POST /api/v1/persons` | — | `PersonCreate` (`.strict()`) | `201` `PersonRead` / `409` (nombre único) / `422` | `personsService.create` / `useCreatePerson()` | Implementado y Probado en UI (`001`, `002`, `003`) |
| **Persons** | `GET /api/v1/persons/{person_id}` | `person_id: UUID` | — | `200` `PersonRead` / `404` / `422` | `personsService.getById` / `usePerson(personId)` | Implementado y Probado en UI (`001`, `003`) |
| **Persons** | `PATCH /api/v1/persons/{person_id}` | `person_id: UUID` | `PersonUpdate` (`.strict()`) | `200` `PersonRead` / `404` / `409` / `422` | `personsService.update` / `useUpdatePerson()` | Implementado y Probado en UI (`001`, `003`) |
| **Persons** | `DELETE /api/v1/persons/{person_id}` | `person_id: UUID` | — | `204 No Content` / `404` / `409` / `422` | `personsService.remove` / `useDeletePerson()` | Implementado y Probado en UI (`001`, `003`) |
| **Expenses** | `GET /api/v1/expenses` | `card_id?`, `person_id?`, `date_from?`, `date_to?`, `active_in_period?` | — | `200` `ExpenseRead[]` / `422` | `expensesService.list` / `useExpenses(filters)` | Implementado y Probado (`001`, `005`) |
| **Expenses** | `POST /api/v1/expenses` | — | `ExpenseCreate` (`.strict()`) | `201` `ExpenseRead` / `404` / `422` | `expensesService.create` / `useCreateExpense()` | Implementado y Probado en UI (`001`, `004`) |
| **Expenses** | `GET /api/v1/expenses/{expense_id}` | `expense_id: UUID` | — | `200` `ExpenseRead` / `404` / `422` | `expensesService.getById` / `useExpense(expenseId)` | Implementado y Probado (`001`, `005`) |
| **Expenses** | `PUT /api/v1/expenses/{expense_id}` | `expense_id: UUID` | `ExpenseUpdate` (`.strict()`) | `200` `ExpenseRead` / `404` / `422` | `expensesService.update` / `useUpdateExpense()` | Implementado y Probado (`001`, `005`) |
| **Expenses** | `DELETE /api/v1/expenses/{expense_id}` | `expense_id: UUID` | — | `204 No Content` / `404` / `422` | `expensesService.remove` / `useDeleteExpense()` | Implementado y Probado (`001`, `005`) |
| **Expenses** | `GET /api/v1/expenses/{expense_id}/schedule` | `expense_id: UUID` | — | `200` `ExpenseScheduleResponse` / `404` / `422` | `expensesService.getSchedule` / `useExpenseSchedule(expenseId)` | Implementado y Probado (`001`, `005`, `006`) |
| **Dashboard** | `GET /api/v1/dashboard/summary` | `period?: YYYY-MM` (opcional; sin param retorna próximo mes) | — | `200` `DashboardSummaryResponse` / `400` / `422` | `dashboardService.getSummary` / `useDashboardSummary(period)` | Implementado y Probado en UI (`001`, `006`, `009`) |
| **Dashboard** | `GET /api/v1/dashboard/projection` | `start_period?: YYYY-MM`, `months?: 1..24` (default `6`) | — | `200` `DashboardProjectionResponse` / `400` / `422` | `dashboardService.getProjection` / `useDashboardProjection(params)` | Implementado y Probado en UI (`001`, `006`) |

---

## 4. Hoja de Ruta y Seguimiento de Specs (`specs/`)

| Spec | Nombre / Alcance | Estado | Progreso de Tareas | Notas / Entregables Clave |
| :--- | :--- | :--- | :--- | :--- |
| **`001-foundation-and-api-core`** | Scaffolding Next.js 15, Tailwind v4 Dark Mode tokens, PWA (`manifest.ts` + Serwist), Vitest, tipos OpenAPI, `api-client.ts` (`ApiError`), esquemas Zod `.strict()`, formateadores (`CLP`/`USD`/`•••• 1234`), `queryKeys`, servicios y hooks TanStack Query v5. | **Completada** | `10 / 10` | Base arquitectónica y capa de datos completa antes de construir vistas. |
| **`002-onboarding-and-navigation-shell`** | `OnboardingGuard` (Zero-State Guard), wizard `/onboarding` en 3 pasos (Bienvenida, Primera Tarjeta, Participantes), shell responsivo (`DesktopSidebar`, `BottomNav` móvil, `AppHeader`) y componentes compartidos (`MoneyDisplay`, `CurrencyBadge`, `PersonChip`, `EmptyState`). | **Completada** | `9 / 9` | Experiencia de primer uso sin fricción, layout segregado y estructura de navegación responsiva Dark Mode. |
| **`003-cards-and-persons-management`** | Vistas `/cards` y `/persons`, formularios de creación/edición en `Dialog`/`Drawer`, selector visual de `color_hex`, toggle optimista `is_active` y flujo de archivado inteligente ante `409 Conflict` (`ArchiveCardAlertDialog` / `ArchivePersonAlertDialog`). | **Completada** | `10 / 10` | Vistas `/cards` y `/persons` completas con sincronización en URL, modales adaptativos Dialog/Drawer, selector de color, confirmación de eliminación y archivado inteligente ante 409 Conflict. |
| **`004-quick-expense-entry`** | `QuickExpenseDrawer` accesible globalmente desde el botón central `+` (mobile) y cabecera (desktop), atajo `Alt+N`/`N`, selección rápida de tarjeta activa con adaptación de moneda, atajos de fecha/cuotas, constructor de repartos `ExpenseSplitBuilder` en modos `EQUAL`, `PERCENTAGE` y `FIXED_AMOUNT` con cálculo en centavos y botón *"Asignar restante"*, orquestador `QuickExpenseForm` con normalización de payload, anti double-submit y mapeo inline de errores `422` de Pydantic. | **Completada** | `10 / 10` | Flujo crítico de captura rápida en terreno, modal adaptativo con protección anti cierre accidental por `isDirty`, resiliencia ante fallos de red e integración global en el shell. |
| **`005-expenses-history-and-schedule`** | Vista `/expenses` con filtros sincronizados en URL (`card_id`, `person_id`, `date_from`, `date_to`, `active_in_period`), edición (`PUT`), eliminación optimista (`DELETE`), `ExpenseScheduleDrawer` con tabla de amortización al vuelo (`GET /expenses/{id}/schedule`) y suite E2E con resiliencia de concurrencia. | **Completada** | `10 / 10` | Historial auditable y desglose cuota por cuota sin cálculos en cliente. |
| **`006-dashboard-and-projections`** | Centro de comando principal `/` (Dashboard), `PeriodSelector` sincronizado con URL y período sugerido del backend, tarjetas KPI multimoneda `CurrencyKpiCards` (`CLP`/`USD`), desgloses `PersonBreakdownSection` y `CardBreakdownSection` (con fechas de corte/vencimiento), `ActiveInstallmentsSection` con modal `ExpenseScheduleDrawer`, `ProjectionChart` a 6 meses con Recharts 3.x segmentado por participante (`color_hex`), `DashboardSkeletons` anti-CLS, y suite de integración E2E `dashboard-integration.test.tsx`. | **Completada** | `10 / 10` | Centro de comando financiero mensual, resumen de cobros y proyección multimoneda a 6 meses completados. |
| **`007-instant-navigation-and-page-transitions`** | Navegación instantánea mediante prefetching proactivo TanStack Query (`onTouchStart`/`onMouseEnter`), barra superior `TopProgressBar` acelerada por GPU (`scaleX` y `opacity`), Suspense nativo `loading.tsx` con skeletons anti-CLS, activación optimista inmediata a 0ms en `BottomNav` y `DesktopSidebar` (`pendingHref`), y `PageTransition` con fade-in a 60 FPS y respeto a `prefers-reduced-motion`. | **Completada** | `7 / 7` | Supresión total de pantallas congeladas, percepción de respuesta instantánea y transiciones fluidas sin alterar SSR ni lógica de datos. |
| **`008-localized-date-format-picker`** | Selector de fecha localizado en formato visual `DD/MM/AAAA`, máscara dinámica en tiempo real, selector gráfico de calendario nativo integrado y sincronizado con `showPicker()`, atajos rápidos locales "Hoy" y "Ayer", y sincronización bidireccional transparente con contrato ISO `YYYY-MM-DD`. | **Completada** | `4 / 4` | Interfaz humana ergonómica en `DD/MM/AAAA` con preservación estricta del contrato ISO del backend y validación de calendario civil. |
| **`009-card-maintenance-fees`** | Gestión integral de mantención de tarjetas de crédito: configuración de mantención base (`default_monthly_fee`) con validación estricta por divisa y normalización de vacíos a `"0"`, exposición de costo mensual en catálogo `CardItem`, diálogo adaptativo `CardFeesDialog` (`Dialog`/`Drawer`) para sobreescrituras mensuales por período (`YYYY-MM`), mutaciones TanStack Query con invalidación en cascada (`cards.fees`, `cards.detail`, `dashboard.all`), transparencia contable en Dashboard `CardBreakdownSection` (compras vs mantención, regla de inactividad `$0` y cuota por participante $1/M) y suite de integración E2E. | **Completada** | `8 / 8` | Configuración base, sobreescrituras mensuales, transparencia contable en dashboard y regla de inactividad implementadas y certificadas al 100%. |
