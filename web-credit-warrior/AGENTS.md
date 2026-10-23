# AGENTS.md — Directrices Operativas de Agentes (`web-credit-warrior`)

Este documento define las reglas operativas, restricciones de negocio, arquitectura y flujo de trabajo **Spec-Driven Development (SDD)** para todos los agentes (`@coordinator`, `@planner`, `@implementer`, `@reviewer`) que construyen **Credit Warrior Web** (`web-credit-warrior`).

---

## 1. Propósito del Repositorio y Relación con el Backend

- **Repositorio**: `web-credit-warrior` (Aplicación Web Frontend / Progressive Web App).
- **Propósito**: Interfaz de usuario Mobile-First y Desktop para gestionar compras con tarjetas de crédito compartidas, visualizar cronogramas de amortización en cuotas y transparentar cuánto debe pagar cada participante mes a mes en múltiples monedas (`CLP` y `USD`).
- **Backend Asociado (`api-credit-warrior`)**:
  - **Base URL Local**: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
  - **Prefijo de Negocio**: `/api/v1` (`http://127.0.0.1:8000/api/v1`)
  - **Health Check**: `GET http://127.0.0.1:8000/health`
  - **Fuentes de Verdad del Contrato**: `docs/openapi.json` (OpenAPI 3.1.0), `docs/resume.md` y `docs/constitution.md`.

---

## 2. Stack Tecnológico Obligatorio

| Capa | Tecnología / Librería | Regla de Uso |
| :--- | :--- | :--- |
| **Framework Core** | **Next.js 15 (App Router)** + React 19 + TypeScript 5 | Uso obligatorio de `src/app`, layouts anidados, `app/manifest.ts` nativo, optimización tipográfica con `next/font/google` (`Plus Jakarta Sans` + `JetBrains Mono`) y tipado estricto (`strict: true`). |
| **Estilos & Sistema UI** | **Tailwind CSS v4 + shadcn/ui (Radix UI)** | Diseño **Dark Mode First** inspirado en banca privada contemporánea y terminales financieras (`#090A0F` canvas, `#12141C` surface, `#1A1D28` elevated, `#232736` hairline border 1px, `#10B981` CLP, `#38BDF8` USD). |
| **Estado del Servidor** | **TanStack Query v5 (`@tanstack/react-query`)** | Único dueño del estado remoto. Prohibido duplicar datos de la API en stores globales (`Zustand`/`Redux`). Uso obligatorio de la fábrica `queryKeys` (`src/lib/query-keys.ts`) e invalidación en cascada. |
| **Formularios & Validación** | **React Hook Form + Zod (`@hookform/resolvers`)** | Todos los esquemas de entrada deben usar `.strict()` (`z.object({...}).strict()`) para cumplir con `extra="forbid"` (`additionalProperties: false`) de Pydantic V2 en el backend. |
| **Visualización de Datos** | **Recharts** (vía `shadcn/ui charts`) | Gráficos SVG responsivos para la proyección financiera de 6 a 24 meses (`CLP` / `USD`). |
| **Feedback, Modales & Iconos** | **Vaul + Sonner + Lucide React** | Drawers táctiles móviles (`vaul`), notificaciones toast no bloqueantes (`sonner`), diálogos de confirmación (`AlertDialog`) e iconografía limpia (`lucide-react`). |
| **PWA** | **`@serwist/next` + `src/app/manifest.ts`** | Soporte de instalación nativa en iOS/Android (`display: 'standalone'`) y caché del App Shell estático. |
| **Testing & Calidad** | **Vitest + React Testing Library + ESLint + TypeScript** | Metodología TDD (tests en rojo -> implementación -> tests en verde) para utilidades, esquemas Zod, servicios HTTP, hooks y componentes. |

---

## 3. Reglas Innegociables de Negocio y Seguridad

El incumplimiento de cualquiera de estas reglas invalida una entrega y debe ser rechazado con `VEREDICTO: CAMBIOS NECESARIOS` por `@reviewer`:

1. **Cero Cálculo Financiero en Cliente (Zero Financial Math on Client)**:
   - El frontend **jamás** calcula fechas de corte (`closing_date`), fechas de vencimiento (`due_date`), valores de cuota (`installment_amount`), períodos de facturación/pago ni absorción de residuos de redondeo.
   - Toda tabla de amortización (`GET /api/v1/expenses/{expense_id}/schedule`), resumen mensual (`GET /api/v1/dashboard/summary`) y proyección (`GET /api/v1/dashboard/projection`) se consume y renderiza directamente desde `api-credit-warrior`.
2. **Montos Monetarios y Porcentajes Estrictamente como `string`**:
   - Para evitar errores de coma flotante IEEE 754 en JavaScript, todos los campos monetarios y porcentuales (`total_amount`, `installment_amount`, `amount_due`, `total_due`, `percentage`, `fixed_amount`, `amount` y valores de `totals_by_currency`) se almacenan, validan, envían y reciben **exclusivamente como `string`** (`"100000"` para `CLP`, `"33.34"` para `USD`).
   - El formateo con `Intl.NumberFormat` y tipografía `JetBrains Mono` (`tabular-nums`) se aplica únicamente en el momento del renderizado visual (`src/lib/formatters.ts`).
   - La única validación aritmética permitida en el cliente es la verificación en el formulario de gasto de que la suma de `percentage` sea exactamente `"100.00"` y la suma de `fixed_amount` iguale a `total_amount`, operando en unidades enteras (centavos/centésimas) mediante `toCents()` para evitar errores de punto flotante.
3. **Esquemas Zod `.strict()` y Reglas de `splits` (`422 Unprocessable Entity`)**:
   - Todo esquema Zod de request (`CardCreate`, `CardUpdate`, `PersonCreate`, `PersonUpdate`, `ExpenseCreate`, `ExpenseUpdate`, `ExpenseSplitInput`) debe invocar `.strict()`.
   - En `ExpenseCreate` y `ExpenseUpdate`:
     - Todos los elementos de `splits` deben compartir el mismo `split_type` (`EQUAL`, `PERCENTAGE` o `FIXED_AMOUNT`) y no pueden repetir `person_id`.
     - Si `split_type === "EQUAL"`, no se envían valores residuales en `percentage` ni `fixed_amount` (se omiten o envían como `null`).
     - Los errores `422` de Pydantic (`detail: [{ loc, msg, type }]`) se mapean a los campos de React Hook Form mediante `mapPydanticErrorsToForm`.
4. **Flujo de Archivado Inteligente ante `409 Conflict`**:
   - Si `DELETE /api/v1/cards/{card_id}` o `DELETE /api/v1/persons/{person_id}` devuelve `409 Conflict` porque el registro posee compras o participaciones asociadas, la UI **no** se limita a mostrar un error genérico: debe abrir un `AlertDialog` explicando la restricción de integridad histórica y ofreciendo **Archivar** el registro ejecutando `PATCH /api/v1/cards/{card_id}` o `PATCH /api/v1/persons/{person_id}` con `{ "is_active": false }`.
   - Si `POST` o `PATCH /api/v1/persons` devuelve `409 Conflict` por nombre duplicado (case-insensitive), el error se inyecta directamente en el campo `name` del formulario (`form.setError('name', ...)`).
5. **Sin Autenticación en el MVP**:
   - No existen pantallas de login, registro de usuarios ni cabeceras `Authorization` en el MVP. Los participantes son entidades maestras `Person`.
6. **Seguridad DOM, PII Masking e Higiene de UI**:
   - **Prohibido** usar `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` o `document.write`. Todo dato externo se renderiza con auto-escaping JSX de React.
   - **Prohibido** usar diálogos nativos del navegador (`alert()`, `confirm()`, `prompt()`). Usar siempre `AlertDialog` o `Drawer` de `shadcn/ui`.
   - **Enmascaramiento obligatorio de tarjeta**: `last_four_digits` (`^\d{4}$`) debe mostrarse siempre formateado como `•••• 1234` mediante `formatMaskedCard(lastFourDigits)`.
   - **Higiene de consola**: Prohibido dejar `console.log` con payloads o respuestas financieras en el código de aplicación.
   - **Binding local seguro**: El servidor de desarrollo y pruebas debe escuchar exclusivamente en `127.0.0.1` (`next dev --hostname 127.0.0.1`), nunca en `0.0.0.0`.

---

## 4. Estructura de Directorios Objetivo

```text
web-credit-warrior/
├── docs/
│   ├── constitution.md                 # Arquitectura y SDD maestro del frontend
│   ├── openapi.json                    # Contrato OpenAPI 3.1.0 del backend
│   └── resume.md                       # Resumen de reglas de negocio y contratos
├── specs/                              # Especificaciones SDD (001..006)
│   └── NNN-nombre/
│       ├── spec.md                     # Requisitos funcionales (EARS) y flujos UX
│       ├── plan.md                     # Diseño técnico de la spec
│       └── tasks.md                    # Lista secuencial de tareas atómicas (T1..Tn)
├── public/
│   ├── icons/                          # Iconos PWA (192x192, 512x512, maskable)
│   └── apple-touch-icon.png
├── src/
│   ├── app/                            # Next.js 15 App Router (Routing & Layouts)
│   │   ├── (main)/                     # Rutas protegidas por OnboardingGuard
│   │   │   ├── layout.tsx              # Shell principal (DesktopSidebar + Mobile BottomNav)
│   │   │   ├── page.tsx                # Dashboard (Resumen mensual + Proyección 6M)
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx            # Historial de compras + Drawer de Amortización
│   │   │   ├── cards/
│   │   │   │   └── page.tsx            # Gestión de Tarjetas (ABM + Archivado 409)
│   │   │   └── persons/
│   │   │       └── page.tsx            # Gestión de Personas (ABM + color_hex + Archivado 409)
│   │   ├── onboarding/
│   │   │   └── page.tsx                # Wizard guiado de 3 pasos (Bienvenida -> Tarjeta -> Personas)
│   │   ├── layout.tsx                  # Root Layout (Dark Mode, Fonts, QueryProvider, Toaster)
│   │   ├── manifest.ts                 # Web App Manifest (PWA)
│   │   ├── sw.ts                       # Service Worker (Serwist)
│   │   └── globals.css                 # Tokens semánticos Tailwind v4 y variables Dark Mode
│   ├── components/
│   │   ├── ui/                         # Primitivas de shadcn/ui (button, dialog, drawer, etc.)
│   │   ├── layout/                     # AppHeader, BottomNav, DesktopSidebar, OnboardingGuard
│   │   └── shared/                     # CurrencyBadge, MoneyDisplay, PersonChip, EmptyState
│   ├── features/                       # Módulos de dominio (vistas y componentes específicos)
│   │   ├── dashboard/
│   │   ├── expenses/
│   │   ├── cards/
│   │   ├── persons/
│   │   └── onboarding/
│   ├── hooks/                          # Custom Hooks de TanStack Query y estado UI
│   │   ├── queries/
│   │   │   ├── use-cards.ts
│   │   │   ├── use-persons.ts
│   │   │   ├── use-expenses.ts
│   │   │   └── use-dashboard.ts
│   │   └── use-onboarding-status.ts
│   ├── schemas/                        # Esquemas Zod estrictos (.strict())
│   │   ├── card.schema.ts
│   │   ├── person.schema.ts
│   │   └── expense.schema.ts
│   ├── services/                       # Cliente HTTP y servicios de dominio hacia api-credit-warrior
│   │   ├── api-client.ts
│   │   ├── cards.service.ts
│   │   ├── persons.service.ts
│   │   ├── expenses.service.ts
│   │   └── dashboard.service.ts
│   ├── types/                          # Contratos TypeScript reflejo de docs/openapi.json
│   │   └── api.types.ts
│   └── lib/                            # Utilidades puras
│       ├── formatters.ts               # Formateo de moneda (CLP/USD), fechas, períodos y •••• 1234
│       ├── query-keys.ts               # Fábrica centralizada de Query Keys
│       └── utils.ts                    # Helper cn() y utilidades de mapeo de errores
├── next.config.ts                      # Security headers (CSP, X-Frame-Options) y Serwist PWA
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 5. Comandos Estándar de Desarrollo y Verificación

> [!IMPORTANT]
> El servidor de desarrollo o pruebas de Next.js debe enlazar siempre a `127.0.0.1` (`--hostname 127.0.0.1`). Nunca exponer en `0.0.0.0`.

| Acción | Comando | Criterio de Éxito |
| :--- | :--- | :--- |
| **Servidor de Desarrollo** | `npm run dev` (`next dev --hostname 127.0.0.1 --port 3000`) | Levanta en `http://127.0.0.1:3000` conectado a `http://127.0.0.1:8000`. |
| **Tests Unitarios / Integración** | `npm test` o `npx vitest run` | 100% de suites y tests en verde (`0 failed`). |
| **Chequeo Estático de Tipos** | `npx tsc --noEmit` (o `npm run typecheck`) | `0 errors` de compilación TypeScript. |
| **Linter** | `npm run lint` | `0 warnings` / `0 errors` de ESLint. |
| **Build de Producción** | `npm run build` | Compilación limpia de rutas App Router y generación de manifest/SW PWA. |

---

## 6. Flujo de Trabajo SDD y Roles de Agentes

### 6.1 Los 4 Agentes del Sistema (`.agents/agents/`)

1. **`@coordinator` (`.agents/agents/coordinator.md`)**:
   - Orquesta las fases SDD (0 a 7) e interactúa con el usuario.
   - No edita código ni ejecuta comandos de consola.
   - Pausa siempre para solicitar la aprobación explícita del usuario en: **(a)** Bootstrap inicial (`AGENTS.md` y `MEMORY.md`), **(b)** Especificación (`spec.md` tras revisión de `@reviewer`), y **(c)** Plan y Tareas (`plan.md` y `tasks.md`).
2. **`@planner` (`.agents/agents/planner.md`)**:
   - Único agente con permiso de escritura en `specs/**` (y denegado en el resto del repositorio).
   - Redacta `specs/NNN-nombre/spec.md` con requisitos funcionales en formato **EARS**, flujos UX y estados de interfaz (carga, vacío accionable, éxito, errores `400`/`404`/`409`/`422`).
   - Una vez aprobada la spec, genera `specs/NNN-nombre/plan.md` y `specs/NNN-nombre/tasks.md` (máximo 10 tareas atómicas secuenciales `T1..Tn`, cada una con los RF que cubre y criterio `"Hecho cuando:"`).
3. **`@implementer` (`.agents/agents/implementer.md`)**:
   - Ejecuta el Bootstrap de Fase 0 o implementa **UNA SOLA** tarea (`T1`, `T2`...) por invocación siguiendo estrictamente el `plan.md` aprobado.
   - Aplica TDD: escribe primero los tests en `Vitest` + `React Testing Library` en rojo y luego la implementación hasta ponerlos en verde (salvo en la tarea inicial de scaffolding donde se instala y configura el entorno).
   - Ejecuta `npm test` (`npx vitest run`), `npx tsc --noEmit` y `npm run lint`, marca `[x]` la tarea en `tasks.md` y se detiene. En la última tarea de cada spec, actualiza `MEMORY.md`.
4. **`@reviewer` (`.agents/agents/reviewer.md`)**:
   - Auditor de Arquitectura y QA Frontend/UX en modo solo lectura (sin permisos de edición).
   - En Fase 0 valida `AGENTS.md` y `MEMORY.md`.
   - En Fase 2 (Clarificación) revisa `spec.md` detectando ambigüedades, contradicciones con `docs/openapi.json` o `docs/constitution.md` y casos límite faltantes.
   - En Fase 5 (Validación) ejecuta `npm test`, `npx tsc --noEmit`, `npm run lint`, inspecciona `git status` / `git diff`, verifica cada RF y las reglas de `docs/constitution.md`, y emite `VEREDICTO: APROBADO` o `VEREDICTO: CAMBIOS NECESARIOS`.

### 6.2 Skills de Diseño y Calidad UI (`.agents/skills/`)

Al diseñar o implementar cualquier componente visual, layout o flujo de interacción, `@planner`, `@implementer` y `@reviewer` deben aplicar:
- **`.agents/skills/frontend-design/SKILL.md`**: Estética intencional de terminal financiera/banca privada, tipografía expresiva (`Plus Jakarta Sans` + `JetBrains Mono`), contraste en modo oscuro (`Obsidian Ink`), micro-interacciones con propósito y cero plantillas genéricas.
- **`.agents/skills/web-design-guidelines/SKILL.md`**: Accesibilidad WAI-ARIA, navegación por teclado (`focus-visible`), `tabular-nums` en columnas numéricas, manejo de textos largos (`truncate`/`min-w-0`), botones con etiquetas activas específicas y sincronización de filtros en URL.
