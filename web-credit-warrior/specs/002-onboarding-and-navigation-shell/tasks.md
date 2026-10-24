# Tareas de Implementación 002 — Shell de Navegación Responsivo y Guardia de Onboarding Inicial (`002-onboarding-and-navigation-shell`)

- **Estado:** completada
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Plan Técnico:** [`specs/002-onboarding-and-navigation-shell/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/002-onboarding-and-navigation-shell/plan.md)
- **Especificación Relacionada:** [`specs/002-onboarding-and-navigation-shell/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/002-onboarding-and-navigation-shell/spec.md)

---

## Tareas Secuenciales Atómicas (T1 a T9)

### [x] T1: Primitivas UI Base de Formularios (`Input`, `Label`) y Utilidades de Ergonomía
- **RFs cubiertos:** RF-06, RF-07, RF-10
- **Archivos involucrados:**
  - `src/components/ui/input.tsx`
  - `src/components/ui/label.tsx`
  - `src/components/ui/ui-primitives.test.tsx`
- **Descripción:**
  Implementar las primitivas estándar de formulario adaptadas al sistema de tokens Dark Mode:
  1. `Input`: Componente de entrada accesible con fondo elevado `#1A1D28`, borde `#232736`, texto `#F3F5F8`, anillo de foco visible `focus-visible:ring-1 focus-visible:ring-[#10B981]`, y variante visual de error con borde `#F43F5E`.
  2. `Label`: Primitiva basada en `@radix-ui/react-label` con tipografía semántica y asociación `htmlFor`.
  Escribir pruebas unitarias en `ui-primitives.test.tsx` verificando renderizado, propagación de propiedades y estados de foco y error.
- **Hecho cuando:**
  `npx vitest run src/components/ui/ui-primitives.test.tsx` pasa en verde, `npx tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Hook `useOnboardingStatus` y Lógica de Detección de Estado Cero (TDD)
- **RFs cubiertos:** RF-03, RF-04
- **Archivos involucrados:**
  - `src/hooks/use-onboarding-status.ts`
  - `src/hooks/use-onboarding-status.test.ts`
- **Descripción:**
  Escribir primero las pruebas unitarias y luego implementar `useOnboardingStatus` consumiendo en paralelo `useCards({ is_active: true })` y `usePersons({ is_active: true })`:
  1. `isOnboarded`: Retorna `true` estrictamente cuando `activeCardsCount >= 1 && activePersonsCount >= 1`.
  2. `isLoading`: Retorna `true` mientras cualquiera de las dos consultas esté pendiente.
  3. `isError`: Retorna `true` ante caídas de red o fallos de servidor, proveyendo función `refetch`.
  4. `initialStep`: Determina el paso de inicio (1 si faltan ambas entidades, 2 si hay personas pero falta tarjeta, 3 si hay tarjeta pero faltan personas).
- **Hecho cuando:**
  100% de los tests en `src/hooks/use-onboarding-status.test.ts` pasan en verde cubriendo catálogos vacíos, parciales, completos y errores de red; `npx tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T3: Componente `OnboardingGuard` con Manejo de Carga y Pantalla Anti-Loop (TDD)
- **RFs cubiertos:** RF-03, RF-09
- **Archivos involucrados:**
  - `src/components/layout/onboarding-guard.tsx`
  - `src/components/layout/onboarding-guard.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente de protección `OnboardingGuard` consumiendo `useOnboardingStatus`:
  1. Si `isLoading`: Renderiza splash transitorio en `#090A0F` con isotipo y pulso sutil de carga (evitando cualquier FOUC del App Shell).
  2. Si `isError`: Renderiza una pantalla de error de conectividad con icono `WifiOff`, mensaje explicativo y botón primario *"Reintentar conexión"* que ejecuta `refetch()` (previniendo loops infinitos de redirección).
  3. Si `!isOnboarded`: Ejecuta `router.replace('/onboarding')`.
  4. Si `isOnboarded`: Renderiza los componentes hijos (`children`).
- **Hecho cuando:**
  `src/components/layout/onboarding-guard.test.tsx` pasa en verde con Vitest simulando los 4 estados posibles; `npx tsc --noEmit` y `npm run lint` terminan con 0 errores.

---

### [x] T4: Componentes del App Shell: `BottomNav`, `DesktopSidebar`, `AppHeader` (TDD)
- **RFs cubiertos:** RF-01, RF-02, RF-10
- **Archivos involucrados:**
  - `src/components/layout/bottom-nav.tsx`
  - `src/components/layout/desktop-sidebar.tsx`
  - `src/components/layout/app-header.tsx`
  - `src/components/layout/layout-components.test.tsx`
- **Descripción:**
  Escribir pruebas y construir los componentes de navegación para las rutas protegidas:
  1. `BottomNav`: Barra fija inferior para `< 768px` con 4 destinos (`/`, `/expenses`, `/cards`, `/persons`), resaltado activo mediante `usePathname()`, padding para safe-areas `pb-[env(safe-area-inset-bottom,0px)]` y botón central `+` con feedback toast informativo en esta fase (*"El registro rápido de compras se habilitará en la siguiente fase de desarrollo"*).
  2. `DesktopSidebar`: Panel lateral izquierdo para `>= 768px` (`w-64`), logotipo, enlaces verticales con hover `#1A1D28`, botón primario *"Registrar gasto"* con toast informativo y estado de conexión en el pie.
  3. `AppHeader`: Cabecera superior con desenfoque de fondo, título sincronizado según la ruta activa y punto de estado de salud del backend (`useHealthCheck`).
- **Hecho cuando:**
  `src/components/layout/layout-components.test.tsx` pasa en verde validando navegación, enlaces activos, disparadores toast del botón `+` y safe-areas; `npx tsc --noEmit` y `npm run lint` limpios.

---

### [x] T5: Rutas Segregadas: `(main)/layout.tsx` y Vistas Iniciales Protegidas
- **RFs cubiertos:** RF-01, RF-02, RF-03
- **Archivos involucrados:**
  - `src/app/(main)/layout.tsx`
  - `src/app/(main)/page.tsx`
  - `src/app/(main)/expenses/page.tsx`
  - `src/app/(main)/cards/page.tsx`
  - `src/app/(main)/persons/page.tsx`
  - `src/app/(main)/main-layout.test.tsx`
- **Descripción:**
  1. Crear el Route Group `src/app/(main)/layout.tsx` estructurando el App Shell: envuelve el contenido en `<OnboardingGuard>`, monta `DesktopSidebar` (escritorio), `AppHeader` (superior) y `BottomNav` (móvil) con padding compensatorio `pb-20 md:pb-6`.
  2. Crear las páginas iniciales protegidas (`/`, `/expenses`, `/cards`, `/persons`) como vistas accesibles en esta fase con títulos descriptivos.
  3. Escribir pruebas en `main-layout.test.tsx` verificando que el layout de `(main)` contiene el guardia y los componentes de navegación.
- **Hecho cuando:**
  `src/app/(main)/main-layout.test.tsx` pasa en verde con Vitest y `npx tsc --noEmit` compila sin errores.

---

### [x] T6: Módulo Onboarding: `StepIndicator`, `WelcomeStep` y `FirstCardStep` (TDD)
- **RFs cubiertos:** RF-05, RF-06, RF-10
- **Archivos involucrados:**
  - `src/features/onboarding/components/step-indicator.tsx`
  - `src/features/onboarding/components/welcome-step.tsx`
  - `src/features/onboarding/components/first-card-step.tsx`
  - `src/features/onboarding/components/first-card-step.test.tsx`
- **Descripción:**
  Escribir pruebas y desarrollar los primeros componentes del asistente:
  1. `StepIndicator`: Barra de progreso accesible con indicador de texto (ej. *"Paso 2 de 3: Primera Tarjeta"*).
  2. `WelcomeStep`: Vista centrada con las 3 ventajas clave de Credit Warrior y botón de inicio *"Comenzar configuración"*.
  3. `FirstCardStep`: Formulario con `react-hook-form` y `cardCreateSchema`, selector `CLP`/`USD` con `CurrencyBadge`, inputs de nombre, últimos 4 dígitos y días 1..31, cápsula explicativa sobre corte vs vencimiento, soporte para modo lectura si se revisa desde el Paso 3, y mutación mediante `useCreateCard`.
- **Hecho cuando:**
  `src/features/onboarding/components/first-card-step.test.tsx` pasa en verde validando validaciones de formulario (días 1..31), selector de moneda, modo lectura y llamada a `useCreateCard`; `npx tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T7: Módulo Onboarding: `FirstPersonsStep` con Selector de Color, Eliminación y Revisión (TDD)
- **RFs cubiertos:** RF-07, RF-09, RF-10
- **Archivos involucrados:**
  - `src/features/onboarding/components/first-persons-step.tsx`
  - `src/features/onboarding/components/first-persons-step.test.tsx`
- **Descripción:**
  Implementar mediante TDD el Paso 3 del asistente:
  1. Formulario de alta rápida con `personCreateSchema` y `useCreatePerson`.
  2. Selector de color accesible con opción neutra explícita que envía `color_hex: null` (renderizando fallback `#8A93A6`).
  3. Bandeja visual de participantes añadidos con `PersonChip` y botón `[ x ]` para eliminar participante vía `useDeletePerson`.
  4. Botón de enlace *"Revisar tarjeta creada"* que activa el callback para volver al Paso 2 en modo lectura sin emitir `POST`.
  5. Captura y mapeo del error `409 Conflict` (nombre duplicado) directamente sobre el campo de texto `name`.
  6. Botón de finalización *"Finalizar y ver Dashboard"* habilitado únicamente si la bandeja cuenta con al menos 1 participante activo.
- **Hecho cuando:**
  `src/features/onboarding/components/first-persons-step.test.tsx` pasa en verde validando selector de color neutro, eliminación de participante, estado del botón de finalización, error 409 y revisión de tarjeta; `npx tsc --noEmit` y `npm run lint` en 0 errores.

---

### [x] T8: `OnboardingWizard` Integral, Layout Aislado `/onboarding/layout.tsx` y Página `/onboarding/page.tsx` (TDD)
- **RFs cubiertos:** RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
- **Archivos involucrados:**
  - `src/features/onboarding/onboarding-wizard.tsx`
  - `src/app/onboarding/layout.tsx`
  - `src/app/onboarding/page.tsx`
  - `src/features/onboarding/onboarding-wizard.test.tsx`
- **Descripción:**
  1. Implementar `OnboardingWizard` coordinando el estado `step: 1 | 2 | 3`, guardado en memoria de la tarjeta creada y lista de participantes.
  2. Configurar la finalización del asistente: invalidación en cascada de `queryKeys.cards.all`, `queryKeys.persons.all` y `queryKeys.dashboard.all`, toast de confirmación y redirección a `/`.
  3. Crear `src/app/onboarding/layout.tsx` con contenedor centrado, limpio, `min-h-[100dvh]`, sin barras de navegación ni sidebar.
  4. Crear `src/app/onboarding/page.tsx` implementando la guardia inversa: si el usuario ya cuenta con tarjetas y personas activas, redirige inmediatamente a `/`.
- **Hecho cuando:**
  `src/features/onboarding/onboarding-wizard.test.tsx` pasa en verde probando el flujo de 3 pasos, la guardia inversa, la invalidación en cascada y las transiciones fluidas; `npx tsc --noEmit` y `npm run lint` limpios.

---

### [x] T9: Verificación Integral End-to-End, Auditoría de Calidad y Actualización de MEMORY.md
- **RFs cubiertos:** RF-01 a RF-10
- **Archivos involucrados:**
  - `MEMORY.md`
  - Todas las suites de prueba del proyecto
- **Descripción:**
  1. Ejecutar la suite completa de pruebas unitarias y de integración (`npm test`).
  2. Ejecutar la verificación estática de tipos (`npm run typecheck`).
  3. Ejecutar el linter (`npm run lint`).
  4. Ejecutar la compilación de producción (`npm run build`) para verificar la correcta segregación de layouts en Next.js 15.
  5. Auditar el cumplimiento de los 10 requisitos funcionales de la especificación `002-onboarding-and-navigation-shell`.
  6. Actualizar `MEMORY.md`: registrar el progreso de la Spec 002 como completada (`9 / 9`), actualizar mapa de navegación y estado de componentes del shell.
- **Hecho cuando:**
  `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` finalizan con 0 errores y 0 advertencias, y `MEMORY.md` refleja el estado final de la especificación 002 listo para `@reviewer`.
