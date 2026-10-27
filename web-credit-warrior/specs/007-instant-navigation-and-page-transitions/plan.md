# Plan Técnico 007 — Navegación Instantánea, Barra de Progreso Superior y Transiciones de Página de Alta Fluidez (`007-instant-navigation-and-page-transitions`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-21
- **Especificación Relacionada:** [`specs/007-instant-navigation-and-page-transitions/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/007-instant-navigation-and-page-transitions/spec.md) (v1.0.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§1, §2, §3.1, §4.1), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura para la Spec 007 implementa el subsistema de navegación instantánea y transiciones de alta fluidez dentro del App Shell de Next.js 15 App Router (`src/components/layout/` y `src/app/(main)/`), integrando la barra de progreso superior acelerada por hardware, el segmento nativo de carga `loading.tsx`, la utilidad de precarga proactiva en TanStack Query y la activación optimista en `BottomNav` y `DesktopSidebar`.

```text
web-credit-warrior/
├── src/
│   ├── app/
│   │   └── (main)/
│   │       ├── layout.tsx                       # Integración de TopProgressBar, PageTransition y App Shell protegido
│   │       └── loading.tsx                      # Segmento nativo de carga instantánea de App Router (Skeletons estructurados)
│   ├── components/
│   │   └── layout/
│   │       ├── top-progress-bar.tsx             # Barra fija superior (2.5px, z-50, scaleX, gradient #10B981 -> #38BDF8)
│   │       ├── top-progress-bar.test.tsx        # Pruebas unitarias de eventos de inicio/fin y aceleración GPU
│   │       ├── page-transition.tsx              # Envoltorio de entrada suave a 60 FPS con soporte prefers-reduced-motion
│   │       ├── page-transition.test.tsx         # Pruebas unitarias de animación de opacidad y accesibilidad
│   │       ├── bottom-nav.tsx                   # Actualización con onTouchStart prefetch y activación optimista 0ms
│   │       ├── bottom-nav.test.tsx              # Pruebas de tab optimista y prefetching táctil
│   │       ├── desktop-sidebar.tsx              # Actualización con onMouseEnter prefetch y activación optimista 0ms
│   │       ├── desktop-sidebar.test.tsx         # Pruebas de tab optimista y prefetching con cursor
│   │       └── instant-navigation-integration.test.tsx # Suite de integración E2E del ciclo completo de navegación
│   └── lib/
│       ├── prefetch.ts                          # Utilidad de precarga proactiva mapeada a TanStack Query y queryKeys
│       └── prefetch.test.ts                     # Pruebas unitarias de mapeo de rutas a queryKeys y queryClient
```

---

## 2. Contratos de Datos, Mapeo de Endpoints y Estrategia de Precarga

### 2.1 Mapeo de Rutas y Consultas Precargadas en TanStack Query

La utilidad `prefetchNavigationTarget(href, queryClient)` en `src/lib/prefetch.ts` mapea de forma determinista la ruta destino con las consultas de datos necesarias:

| Ruta Destino (`href`) | Endpoints Precargados | Claves de TanStack Query (`queryKeys`) | Función de Consulta |
| :--- | :--- | :--- | :--- |
| **`/` (Dashboard)** | `GET /api/v1/dashboard/summary`<br>`GET /api/v1/dashboard/projection`<br>`GET /api/v1/cards`<br>`GET /api/v1/persons` | `queryKeys.dashboard.summary()`<br>`queryKeys.dashboard.projection({ months: 6 })`<br>`queryKeys.cards.list()`<br>`queryKeys.persons.list()` | `dashboardService.getSummary()`<br>`dashboardService.getProjection()`<br>`cardsService.list()`<br>`personsService.list()` |
| **`/expenses` (Compras)** | `GET /api/v1/expenses`<br>`GET /api/v1/cards`<br>`GET /api/v1/persons` | `queryKeys.expenses.list({})`<br>`queryKeys.cards.list()`<br>`queryKeys.persons.list()` | `expensesService.list()`<br>`cardsService.list()`<br>`personsService.list()` |
| **`/cards` (Tarjetas)** | `GET /api/v1/cards` | `queryKeys.cards.list({})` | `cardsService.list()` |
| **`/persons` (Personas)** | `GET /api/v1/persons` | `queryKeys.persons.list({})` | `personsService.list()` |

### 2.2 Estrategia de Caché y Deduplicación de Red
- `queryClient.prefetchQuery`: Si la clave de consulta ya se encuentra en caché en estado fresco (`staleTime`), TanStack Query **no emite** ninguna llamada de red redundante.
- El prefetching se ejecuta en segundo plano con baja prioridad, asegurando que no compita con peticiones activas de la pantalla actual.
- Los enlaces en `BottomNav` y `DesktopSidebar` configuran adicionalmente `prefetch={true}` en el componente `<Link>` de Next.js, precargando de forma automática los paquetes JavaScript y RSC del segmento destino.

---

## 3. Detección y Ciclo de Vida de Navegación en Next.js 15 App Router

### 3.1 El Desafío de la Ausencia de `router.events`
En Next.js 15 (App Router), el objeto retornado por `useRouter()` **no expone** el bus de eventos `router.events` (`routeChangeStart`, `routeChangeComplete`) característico del antiguo Pages Router.

### 3.2 Estrategia de Intercepción y Finalización Híbrida
Para lograr activación inmediata a 0ms y finalización exacta:
1. **Activación Inmediata (0ms) en Enlaces**:
   - Se intercepta el evento de pulsación (`click`) en enlaces internos que pertenezcan a la aplicación (mismo origen, ruta relativa o pathname coincidente, excluyendo modificadores como `Cmd+Click`, `Ctrl+Click` o `target="_blank"`).
   - Se expone adicionalmente un canal de control desacoplado (custom event `cw:navigation-start` o helper `startNavigation()`) para permitir activaciones programáticas.
   - La barra de progreso superior salta de inmediato a `scaleX(0.2)` en 0ms y comienza a avanzar de forma orgánica hacia `scaleX(0.8)`.
2. **Finalización Determinista vía `usePathname()` y `useSearchParams()`**:
   - `TopProgressBar` observa `pathname` y `searchParams`.
   - Cuando Next.js completa la transición del segmento y actualiza el árbol de componentes, el cambio de `pathname` o `searchParams` dispara inmediatamente la fase de culminación:
     1. La barra salta a `scaleX(1.0)` en menos de 80ms.
     2. Se aplica una transición de opacidad `opacity: 0` de 150ms.
     3. Al finalizar, se restablece a `scaleX(0)` lista para el próximo ciclo.
3. **Manejo de Errores e Interrupciones**:
   - Un temporizador de seguridad de 8 segundos finaliza y desvanece automáticamente la barra si la navegación se interrumpe o cancela, evitando que la barra quede atascada.

---

## 4. Diseño UI/UX y Sistema de Animaciones Aceleradas por GPU

### 4.1 Especificación Visual de `TopProgressBar`
- **Posición**: `fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none`
- **Gradiente cromático**: `linear-gradient(to right, #10B981, #38BDF8)` (Esmeralda CLP a Cian USD)
- **Sombra luminosa (Glow)**: `box-shadow: 0 0 10px #38BDF8, 0 0 4px #10B981` en el extremo frontal derecho.
- **Rendimiento GPU**: Se anima exclusivamente con `transform: scaleX(...)` originado en `left` (`origin-left`) y `opacity`. Cero cambios de layout o reflows.

### 4.2 Activación Optimista en Pestañas (`pendingHref`)
En `BottomNav` y `DesktopSidebar`:
- Se introduce un estado local o contexto ligero `pendingHref: string | null`.
- Al pulsar un elemento del menú (`onTouchStart` o `onClick`):
  - Se asigna `pendingHref = item.href` de inmediato (0ms).
  - La condición de activación visual evalúa: `isActive = (pendingHref ?? pathname) === item.href`.
  - El icono y texto del ítem se iluminan instantáneamente en `#10B981` (Emerald CLP).
- Cuando `pathname` cambia a la nueva ruta, un `useEffect` reconcilia el estado reseteando `pendingHref = null`.
- Si el usuario cancela o la navegación no se concreta en un plazo razonable, `pendingHref` se limpia automáticamente.

### 4.3 Segmento de Carga Nativo `src/app/(main)/loading.tsx`
- Se crea como Server/Client Component en el grupo de rutas `(main)`.
- Renderiza un esqueleto visual estructurado que preserva las dimensiones del layout principal:
  - Skeleton de cabecera de página (`h-8 w-48`).
  - Grid de skeletons para tarjetas KPI o resúmenes (`grid md:grid-cols-2 gap-4`).
  - Skeleton de bloque principal (`h-64 rounded-xl bg-elevated/60 animate-pulse`).
- Cuenta con los atributos de accesibilidad `role="status"` y `aria-busy="true"`.

### 4.4 Transición Suave de Página `PageTransition`
- Componente envoltorio `PageTransition` en `src/components/layout/page-transition.tsx`:
  - Envuelve `{children}` en `src/app/(main)/layout.tsx`.
  - Utiliza `key={pathname}` para desencadenar una animación suave de entrada en cada cambio de ruta.
  - Clase CSS: `animate-in fade-in duration-200 fill-mode-both ease-out`.
  - Regla de accesibilidad: `@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }`.

---

## 5. Registro de Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Detección de Navegación** | Intercepción de clics en enlaces internos + listener en `pathname`/`searchParams`. | Uso de librerías externas pesadas (ej. `nprogress`) o polling. | `nprogress` introduce dependencias de manipulación directa del DOM incompatibles con SSR y React 19. El enfoque nativo aprovecha la reactividad de Next.js sin añadir dependencias. |
| **Animación de Barra de Progreso** | `transform: scaleX(...)` y `opacity` en GPU. | Animar `width: 0% -> 100%`. | Animar `width` provoca recálculos de layout y reflows continuos en el hilo principal de la CPU. `scaleX` se ejecuta en el compositor de la GPU a 60 FPS estables. |
| **Disparador de Precarga de Datos** | Evento `onTouchStart` en móvil y `onMouseEnter` en escritorio. | Precargar solo al hacer clic o precargar todas las rutas al montar la app. | Precargar todo al inicio consume ancho de banda móvil innecesario. Disparar en `onTouchStart` o `onMouseEnter` aprovecha los 100-200ms de latencia de interacción humana para precargar antes del clic real. |
| **Activación de Pestañas** | Estado optimista `pendingHref` inmediato (0ms). | Esperar a que Next.js actualice `usePathname()`. | En redes móviles, `usePathname()` puede tardar entre 200ms y 500ms en cambiar, dando la sensación de que el botón no respondió al toque. La activación optimista brinda certeza táctil instantánea. |
| **Supresión de Pantalla Congelada** | `src/app/(main)/loading.tsx` nativo de App Router. | Manejo manual de spinners en cada página. | `loading.tsx` es el estándar oficial de Next.js 15 App Router: genera un límite `<Suspense>` automático a nivel de layout sin requerir lógica redundante en cada vista. |

---

## 6. Estrategia de Pruebas y Verificación

| Nivel de Prueba | Componente / Archivo | Cobertura de RF | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **Unitaria (Lógica)** | `src/lib/prefetch.test.ts` | RF-03 | Mapeo exacto de rutas a `queryKeys`, deduplicación de queries en caché y tolerancia a rutas desconocidas. |
| **Unitaria (Componente)** | `src/components/layout/top-progress-bar.test.tsx` | RF-01 | Inicio inmediato ante clic en enlace, ciclo orgánico de avance, finalización ante cambio de pathname y atributos `aria-hidden`. |
| **Unitaria (Componente)** | `src/app/(main)/loading.test.tsx` | RF-02 | Renderizado de esqueletos de carga estructurados con `role="status"` y `aria-busy="true"`. |
| **Unitaria (Componente)** | `src/components/layout/bottom-nav.test.tsx` | RF-03, RF-04 | Activación inmediata de pestaña a 0ms (`pendingHref`), llamada a `prefetchNavigationTarget` en `touchStart` y reconciliación de ruta. |
| **Unitaria (Componente)** | `src/components/layout/desktop-sidebar.test.tsx` | RF-03, RF-04 | Activación optimista en clic, llamada a precarga en `mouseEnter` y preservación de accesibilidad. |
| **Unitaria (Componente)** | `src/components/layout/page-transition.test.tsx` | RF-05 | Entrada suave con desvanecimiento, respeto a `prefers-reduced-motion` y cambio con `key={pathname}`. |
| **Integración E2E** | `src/components/layout/instant-navigation-integration.test.tsx` | RF-01 a RF-05 | Flujo completo de navegación entre Dashboard, Compras, Tarjetas y Personas dentro de `MainLayout`, verificando barra, tabs, prefetching y build limpio. |
