# Tareas de Implementación 001 — Fundación Visual, Reglas de Precisión y Núcleo de Comunicación API (`001-foundation-and-api-core`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-19
- **Plan Técnico:** [`specs/001-foundation-and-api-core/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/001-foundation-and-api-core/plan.md)
- **Especificación Relacionada:** [`specs/001-foundation-and-api-core/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/001-foundation-and-api-core/spec.md)

---

## Tareas Secuenciales Atómicas (T1 a T10)

### [x] T1: Scaffolding del Proyecto Next.js 15, Tooling y Configuración de Calidad
- **RFs cubiertos:** RF-01, RF-03
- **Archivos involucrados:**
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `postcss.config.mjs`
  - `vitest.config.ts`
  - `src/test/setup.ts`
  - `.env.example`
  - `.env.local`
- **Descripción:**
  Inicializar la estructura del proyecto e instalar las dependencias exactas: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS v4, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@serwist/next`, `lucide-react`, `sonner`, `vaul`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom` y `jsdom`. Configurar los scripts de npm (`dev` con `--hostname 127.0.0.1`, `build`, `lint`, `typecheck` y `test`). Configurar `vitest.config.ts` con entorno `jsdom` y path aliases `@/*`.
- **Hecho cuando:**
  `npm run typecheck` (`tsc --noEmit`), `npx vitest run` y `npm run lint` se ejecutan sin errores en la terminal (exit code 0).

---

### [x] T2: Tokens Visuales Dark Mode, Tipografía Dual y Configuración Global de Estilos
- **RFs cubiertos:** RF-01, RF-02
- **Archivos involucrados:**
  - `src/app/globals.css`
  - `src/lib/utils.ts`
  - `src/lib/utils.test.ts`
- **Descripción:**
  Configurar la directiva `@theme` de Tailwind CSS v4 en `src/app/globals.css` con los tokens semánticos de la paleta Dark Mode First: `--color-canvas: #090a0f`, `--color-surface: #12141c`, `--color-elevated: #1a1d28`, `--color-border-subtle: #232736`, `--color-text-primary: #f3f5f8`, `--color-text-muted: #8a93a6`, `--color-accent-clp: #10b981`, `--color-accent-usd: #38bdf8`, `--color-accent-warning: #f59e0b`, `--color-accent-danger: #f43f5e`. Declarar variables tipográficas para `Plus Jakarta Sans` y `JetBrains Mono`. Implementar el helper `cn()` (`clsx` + `tailwind-merge`) en `src/lib/utils.ts` con tests unitarios.
- **Hecho cuando:**
  `npx vitest run src/lib/utils.test.ts` pasa en verde, los estilos compilan sin errores de sintaxis CSS y `npx tsc --noEmit` reporta 0 errores.

---

### [x] T3: Formateadores Visuales e Inmutabilidad Financiera (TDD)
- **RFs cubiertos:** RF-02, RF-04, RF-05
- **Archivos involucrados:**
  - `src/lib/formatters.ts`
  - `src/lib/formatters.test.ts`
- **Descripción:**
  Escribir primero las pruebas en `formatters.test.ts` y luego implementar en `formatters.ts` las funciones puras de formateo sobre strings:
  1. `formatCurrency(amount, currency)`: CLP entero con puntos de miles (`$100.000`, `$0`), USD con 2 decimales y prefijo US$ (`US$33.34`, `US$0.00`).
  2. `formatPercentage(percentage)`: Formato con 2 decimales y sufijo `%` (`70.00%`, `33.33%`).
  3. `formatPeriod(period, format)`: Nombres de mes en español (`Noviembre 2026` / `Nov 2026`) sin desfase por huso horario UTC.
  4. `formatDate(dateStr)`: Fecha civil en español (`16 oct 2026`) sin desplazamiento de medianoche UTC en husos horarios occidentales.
  5. `formatMaskedCard(lastFourDigits)`: Máscara `•••• 1234` si contiene 4 dígitos; cadena vacía `""` si es `null` o vacío.
  6. `toCents(val)`: Conversión determinista de strings numéricos a unidades enteras (centavos/centésimas) para validaciones aritméticas de sumas sin error IEEE 754.
- **Hecho cuando:**
  100% de los tests en `src/lib/formatters.test.ts` pasan en verde con Vitest cubriendo todos los casos límite (montos en cero, nulos, zonas horarias negativas), y `npx tsc --noEmit` reporta 0 errores.

---

### [x] T4: Contratos TypeScript Espejados de OpenAPI 3.1.0
- **RFs cubiertos:** RF-04, RF-08
- **Archivos involucrados:**
  - `src/types/api.types.ts`
- **Descripción:**
  Definir y exportar todos los contratos e interfaces TypeScript correspondientes a los 19 endpoints de `docs/openapi.json`: `CurrencyEnum`, `SplitTypeEnum`, `CardRead`, `CardCreate`, `CardUpdate`, `PersonRead`, `PersonCreate`, `PersonUpdate`, `ExpenseSplitInput`, `ExpenseSplitRead`, `ExpenseCreate`, `ExpenseUpdate`, `ExpenseRead`, `InstallmentScheduleItem`, `ExpenseScheduleResponse`, `CardMonthlySummary`, `CardPersonBreakdown`, `PersonMonthlySummary`, `ActiveInstallmentItem`, `DashboardSummaryResponse`, `DashboardProjectionResponse`, `ValidationErrorItem` y `HTTPValidationError`. Preservar todos los campos monetarios y porcentuales estrictamente como `string`.
- **Hecho cuando:**
  `src/types/api.types.ts` exporta la totalidad de los contratos sin tipos `any`, alineados exactamente con los nombres de campos del OpenAPI, y `npx tsc --noEmit` finaliza con 0 errores.

---

### [x] T5: Esquemas Zod Estrictos (`.strict()`) y Validación de Splits (TDD)
- **RFs cubiertos:** RF-04, RF-08
- **Archivos involucrados:**
  - `src/schemas/card.schema.ts`
  - `src/schemas/person.schema.ts`
  - `src/schemas/expense.schema.ts`
  - `src/schemas/card.schema.test.ts`
  - `src/schemas/person.schema.test.ts`
  - `src/schemas/expense.schema.test.ts`
- **Descripción:**
  Escribir primero las pruebas unitarias y luego implementar los esquemas Zod con validación estricta `.strict()` para cumplir con `extra="forbid"`:
  1. `cardCreateSchema` y `cardUpdateSchema`: En `cardUpdateSchema` todos los campos son opcionales y anulables para soportar `PATCH { "is_active": false }`.
  2. `personCreateSchema` y `personUpdateSchema`: En `personUpdateSchema` todos los campos son opcionales y anulables para soportar el archivado.
  3. `expenseSplitInputSchema`: Exige strings positivos mayores a cero (`exclusiveMinimum: 0.0`) para `percentage` y `fixed_amount`, con límite de `100.0` para porcentajes.
  4. `expenseCreateSchema` y `expenseUpdateSchema`: Valida con `.superRefine()` la no duplicación de `person_id`, uniformidad de `split_type`, suma exacta de `100.00%` (`10000` centésimas enteras) para `PERCENTAGE`, y suma de montos fijos exactamente igual a `total_amount` para `FIXED_AMOUNT`.
- **Hecho cuando:**
  Todas las suites de prueba en `src/schemas/*.test.ts` pasan en verde con Vitest (verificando rechazo de propiedades no autorizadas, sumas incorrectas, parcialidad de updates y valores mayores a cero), y `npx tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T6: Cliente HTTP Tipado (`api-client.ts`), Normalización de Errores y Health Service (TDD)
- **RFs cubiertos:** RF-06, RF-07
- **Archivos involucrados:**
  - `src/services/api-client.ts`
  - `src/services/health.service.ts`
  - `src/lib/utils.ts` (`mapPydanticErrorsToForm`)
  - `src/services/api-client.test.ts`
- **Descripción:**
  Implementar mediante TDD el cliente HTTP fetch tipado:
  1. Clase de error `ApiError` que encapsula `status` y `detail` distinguiendo errores de dominio (`400`, `404`, `409` con mensaje string), errores de validación (`422` con array `ValidationErrorItem`), y fallos de red/servidor no disponible (`status: 0`).
  2. Función `buildQueryString` que omite parámetros `undefined`, `null` y `""`.
  3. Procesamiento seguro de respuestas `204 No Content` sin invocar `response.json()`.
  4. Helper `mapPydanticErrorsToForm` que remueve el prefijo `"body"` de `loc` y asocia los errores a los campos de React Hook Form.
  5. Servicio `health.service.ts` invocando `GET /health`.
- **Hecho cuando:**
  `src/services/api-client.test.ts` pasa en verde con pruebas unitarias que simulan respuestas 200, 204, 400, 404, 409, 422, filtrado de query params y errores de red, y `npx tsc --noEmit` compila con 0 errores.

---

### [x] T7: Fábrica de Query Keys, Servicios de Dominio y Hooks de TanStack Query (TDD)
- **RFs cubiertos:** RF-06, RF-09
- **Archivos involucrados:**
  - `src/lib/query-keys.ts`
  - `src/services/cards.service.ts`
  - `src/services/persons.service.ts`
  - `src/services/expenses.service.ts`
  - `src/services/dashboard.service.ts`
  - `src/hooks/queries/use-health.ts`
  - `src/hooks/queries/use-cards.ts`
  - `src/hooks/queries/use-persons.ts`
  - `src/hooks/queries/use-expenses.ts`
  - `src/hooks/queries/use-dashboard.ts`
  - `src/hooks/queries/use-queries.test.tsx`
- **Descripción:**
  1. Implementar la fábrica `queryKeys` centralizando las claves para health, cards, persons, expenses y dashboard.
  2. Implementar los servicios de dominio que conectan con los 19 endpoints de OpenAPI usando `apiClient`.
  3. Crear los custom hooks de TanStack Query configurando `staleTime: 5 min` para catálogos maestros (`cards`, `persons`) y `staleTime: 30 seg` con recarga al enfocar ventana para datos financieros (`expenses`, `dashboard`).
  4. Configurar la invalidación en cascada: mutaciones en tarjetas, personas o compras invalidan su catálogo respectivo y `queryKeys.dashboard.all` (`summary` y `projection`).
- **Hecho cuando:**
  `src/hooks/queries/use-queries.test.tsx` pasa en verde validando la generación de claves, consumo de servicios e invalidación en cascada hacia el dashboard tras mutaciones, con `npx tsc --noEmit` y `npm run lint` limpios.

---

### [x] T8: Primitivas Visuales Compartidas del Dominio y Notificaciones Toast (TDD)
- **RFs cubiertos:** RF-01, RF-02, RF-05, RF-10
- **Archivos involucrados:**
  - `src/components/shared/money-display.tsx`
  - `src/components/shared/currency-badge.tsx`
  - `src/components/shared/person-chip.tsx`
  - `src/components/shared/empty-state.tsx`
  - `src/components/ui/button.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/sonner.tsx`
  - `src/components/shared/shared-components.test.tsx`
- **Descripción:**
  Escribir pruebas con React Testing Library y crear las primitivas compartidas del dominio:
  1. `MoneyDisplay`: Formatea montos en CLP o USD con tipografía `font-mono tabular-nums`.
  2. `CurrencyBadge`: Insignias para CLP (`#10B981`) y USD (`#38BDF8`) con contraste accesible.
  3. `PersonChip`: Píldora con indicador de `color_hex` o fallback neutro (`#8A93A6`) y truncamiento de nombres largos.
  4. `EmptyState`: Superficie `#12141C`, icono, mensaje claro y botón de acción con verbo activo.
  5. `Toaster`: Configuración de Sonner integrada con los tokens de color oscuro.
- **Hecho cuando:**
  `src/components/shared/shared-components.test.tsx` pasa en verde verificando renderizado de cifras monetarias, colores de badges, fallback de participantes y eventos de interacción del estado vacío, con `npx tsc --noEmit` y `npm run lint` en verde.

---

### [x] T9: Root Layout, Configuración PWA, Cabeceras de Seguridad y Página de Fundación
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-06, RF-10
- **Archivos involucrados:**
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/manifest.ts`
  - `src/app/sw.ts`
  - `next.config.ts`
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-512x512.png`
  - `public/icons/icon-maskable-512x512.png`
  - `src/components/providers/query-provider.tsx`
  - `src/app/layout.test.tsx`
- **Descripción:**
  1. Configurar `src/app/layout.tsx` cargando las fuentes `Plus Jakarta Sans` y `JetBrains Mono` con `next/font/google`, clase raíz `dark`, `QueryClientProvider` y `Toaster`.
  2. Implementar `src/app/manifest.ts` exponiendo `display: "standalone"`, `background_color: "#090A0F"`, `theme_color: "#090A0F"` e iconos PWA.
  3. Configurar el Service Worker `src/app/sw.ts` con Serwist y cabeceras estrictas de seguridad en `next.config.ts` (CSP restringido a 'self' y API backend, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`).
  4. Crear `src/app/page.tsx` como página de verificación que muestra el estado de conexión con `GET /health` y demuestra el funcionamiento de las primitivas compartidas (`MoneyDisplay`, `CurrencyBadge`, `PersonChip`).
- **Hecho cuando:**
  `npm run build` compila limpiamente generando el manifiesto PWA, `src/app/layout.test.tsx` pasa en verde y las cabeceras de seguridad se encuentran debidamente aplicadas.

---

### [x] T10: Verificación Integral End-to-End, Auditoría de Calidad y Actualización de MEMORY.md
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
- **Archivos involucrados:**
  - `MEMORY.md`
  - Todas las suites de pruebas del proyecto
- **Descripción:**
  1. Ejecutar la suite completa de pruebas de Vitest (`npm test`).
  2. Ejecutar la verificación estática de tipos de TypeScript (`npm run typecheck`).
  3. Ejecutar el linter de ESLint (`npm run lint`).
  4. Comprobar que el comando de desarrollo escucha en `127.0.0.1` (`next dev --hostname 127.0.0.1`).
  5. Auditar el cumplimiento riguroso de los 10 requisitos funcionales de la especificación `001-foundation-and-api-core`.
  6. Actualizar `MEMORY.md`: registrar el progreso de Spec 001 como completado (`10 / 10`), actualizar el estado de los contratos y habilitar la transición a Spec 002.
- **Hecho cuando:**
  `npm test`, `npm run typecheck` y `npm run lint` finalizan con 0 errores y 0 advertencias, `MEMORY.md` refleja el estado final de la especificación 001 y el código queda listo para la aprobación de `@reviewer`.
