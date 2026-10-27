# Tareas de Implementación 007 — Navegación Instantánea, Barra de Progreso Superior y Transiciones de Página de Alta Fluidez (`007-instant-navigation-and-page-transitions`)

- **Estado:** completado
- **Versión:** 1.0.0
- **Fecha:** 2026-10-21
- **Plan Técnico:** [`specs/007-instant-navigation-and-page-transitions/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/007-instant-navigation-and-page-transitions/plan.md)
- **Especificación Relacionada:** [`specs/007-instant-navigation-and-page-transitions/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/007-instant-navigation-and-page-transitions/spec.md) (v1.0.0, aprobado)

---

## Tareas Secuenciales Atómicas (T1 a T7)

### [x] T1: Utilidad de Precarga Proactiva de Rutas `prefetchNavigationTarget` (TDD)
- **RFs cubiertos:** RF-03
- **Archivos involucrados:**
  - `src/lib/prefetch.ts`
  - `src/lib/prefetch.test.ts`
- **Descripción:**
  Implementar mediante TDD la función `prefetchNavigationTarget(href, queryClient)`:
  1. Mapea la ruta solicitada a sus respectivas consultas en TanStack Query:
     - `'/'`: precarga `queryKeys.dashboard.summary()`, `queryKeys.dashboard.projection({ months: 6 })`, `queryKeys.cards.list()` y `queryKeys.persons.list()`.
     - `'/expenses'`: precarga `queryKeys.expenses.list({})`, `queryKeys.cards.list()` y `queryKeys.persons.list()`.
     - `'/cards'`: precarga `queryKeys.cards.list({})`.
     - `'/persons'`: precarga `queryKeys.persons.list({})`.
  2. Ejecuta `queryClient.prefetchQuery` con los servicios correspondientes sin duplicar llamadas si los datos están frescos en caché.
  3. Maneja de forma silenciosa y segura rutas no configuradas o externas.
- **Hecho cuando:**
  `npx vitest run src/lib/prefetch.test.ts` pasa en verde probando la precarga de queries correctas para cada una de las 4 rutas principales, deduplicación de red y tolerancia a rutas desconocidas; `tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Componente de Barra de Progreso Superior Acelerada por GPU `TopProgressBar` (TDD)
- **RFs cubiertos:** RF-01
- **Archivos involucrados:**
  - `src/components/layout/top-progress-bar.tsx`
  - `src/components/layout/top-progress-bar.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `TopProgressBar`:
  1. Barra fijada en `fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none`.
  2. Estilo con gradiente semántico `#10B981` a `#38BDF8` y resplandor luminoso en el borde derecho.
  3. Animación acelerada por GPU mediante `transform: scaleX(...)` originada a la izquierda (`origin-left`) y `opacity`.
  4. Interceptor de clics en enlaces internos: al hacer clic en un enlace interno, activa la barra a 0ms saltando a 20%-30% y avanzando orgánicamente hacia ~80%.
  5. Observador de `pathname` y `searchParams`: al cambiar la ruta, la barra salta a 100% en < 80ms y se desvanece suavemente con `opacity: 0` en 150ms.
  6. Respeta la preferencia del sistema operativo `@media (prefers-reduced-motion: reduce)`, deshabilitando las transiciones animadas si está activa.
  7. Atributos de accesibilidad con `aria-hidden="true"`.
- **Hecho cuando:**
  `npx vitest run src/components/layout/top-progress-bar.test.tsx` pasa en verde probando activación inmediata (0ms) ante clics en enlaces internos, avance orgánico, culminación al cambiar de pathname, ocultamiento con fade-out, respeto a `prefers-reduced-motion` y atributos `pointer-events-none`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Segmento de Carga Nativo de App Router `src/app/(main)/loading.tsx` (TDD)
- **RFs cubiertos:** RF-02
- **Archivos involucrados:**
  - `src/app/(main)/loading.tsx`
  - `src/app/(main)/loading.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente de carga nativo `loading.tsx` en el grupo de rutas `(main)`:
  1. Provee un límite automático de `<Suspense>` para transiciones de página en Next.js 15 App Router, sustituyendo de inmediato la vista anterior y suprimiendo cualquier sensación de pantalla congelada.
  2. Renderiza esqueletos visuales estructurados que preservan la geometría del layout:
     - Header skeleton (`h-8 w-48 rounded-md bg-elevated/80`).
     - Grid de 2 tarjetas KPI (`grid md:grid-cols-2 gap-4`).
     - Contenedor de contenido estructurado (`h-64 rounded-xl bg-elevated/60 animate-pulse`).
  3. Contiene los atributos de accesibilidad `role="status"` y `aria-busy="true"`.
- **Hecho cuando:**
  `npx vitest run src/app/\(main\)/loading.test.tsx` pasa en verde probando renderizado de la estructura visual de esqueletos, presencia de roles accesibles y coherencia de dimensiones para evitar CLS (< 0.05); `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Navegación Inferior Móvil `BottomNav` con Activación Optimista y Precarga Táctil (TDD)
- **RFs cubiertos:** RF-03, RF-04
- **Archivos involucrados:**
  - `src/components/layout/bottom-nav.tsx`
  - `src/components/layout/bottom-nav.test.tsx`
- **Descripción:**
  Actualizar mediante TDD el componente `BottomNav`:
  1. `onTouchStart`: dispara la precarga proactiva `prefetchNavigationTarget(item.href, queryClient)` en el instante en que el usuario toca la pestaña, ganando 100-200ms de latencia de red.
  2. Activación optimista inmediata: gestiona un estado `pendingHref`. Al tocar o hacer clic en una pestaña, ilumina de inmediato (0ms) el icono y texto en `#10B981` antes de que la URL finalice su transición.
  3. Reconciliación: resetea `pendingHref` cuando `pathname` cambia a la nueva ruta o ante cancelación.
  4. Habilita `prefetch={true}` en `<Link>` de Next.js para asegurar la precarga de los paquetes RSC y JavaScript.
  5. Mantiene el atributo semántico `aria-current="page"` debidamente sincronizado con la ruta activa o pendiente.
- **Hecho cuando:**
  `npx vitest run src/components/layout/bottom-nav.test.tsx` pasa en verde probando iluminación inmediata a 0ms en contacto táctil/clic, ejecución de `prefetchNavigationTarget` en `onTouchStart`, reconciliación con `pathname` y preservación de accesibilidad; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T5: Barra Lateral de Escritorio `DesktopSidebar` con Activación Optimista y Precarga Hover (TDD)
- **RFs cubiertos:** RF-03, RF-04
- **Archivos involucrados:**
  - `src/components/layout/desktop-sidebar.tsx`
  - `src/components/layout/desktop-sidebar.test.tsx`
- **Descripción:**
  Actualizar mediante TDD el componente `DesktopSidebar`:
  1. `onMouseEnter`: dispara la precarga proactiva `prefetchNavigationTarget(item.href, queryClient)` en cuanto el cursor se posa sobre un ítem de navegación.
  2. Activación optimista inmediata: gestiona `pendingHref` e ilumina inmediatamente (0ms) el ítem seleccionado en `#10B981` al hacer clic.
  3. Reconciliación: resetea `pendingHref` al confirmarse el nuevo `pathname`.
  4. Habilita `prefetch={true}` en `<Link>`.
  5. Preserva la accesibilidad del menú lateral (`aria-current="page"`).
- **Hecho cuando:**
  `npx vitest run src/components/layout/desktop-sidebar.test.tsx` pasa en verde probando activación optimista en clic, llamada a precarga proactiva en `onMouseEnter`, reconciliación y atributos accesibles; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T6: Componente de Transición Suave de Página `PageTransition` (TDD)
- **RFs cubiertos:** RF-05
- **Archivos involucrados:**
  - `src/components/layout/page-transition.tsx`
  - `src/components/layout/page-transition.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `PageTransition`:
  1. Recibe `children` y utiliza la clave de ruta `pathname` para desencadenar una animación suave de entrada en cada cambio de página.
  2. Aplica animación fluida a 60 FPS mediante transición de opacidad (`animate-in fade-in duration-200 ease-out fill-mode-both`).
  3. Soporte estricto de accesibilidad: deshabilita cualquier animación o desvanecimiento cuando la regla de medios `@media (prefers-reduced-motion: reduce)` está activa.
  4. Garantiza que no se produzcan parpadeos blancos ni saltos estructurales de contenido.
- **Hecho cuando:**
  `npx vitest run src/components/layout/page-transition.test.tsx` pasa en verde probando animación de desvanecimiento suave al cambiar de ruta, estabilidad estructural y respeto a `prefers-reduced-motion`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T7: Integración Global en `src/app/(main)/layout.tsx`, Verificación E2E y Suite de Regresión
- **RFs cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05
- **Archivos involucrados:**
  - `src/app/(main)/layout.tsx`
  - `src/components/layout/instant-navigation-integration.test.tsx`
- **Descripción:**
  Integrar todos los componentes de navegación fluida en el layout principal y verificar el ciclo completo:
  1. Incorporar `TopProgressBar` fijada en el tope del shell en `MainLayoutContent`.
  2. Envolver `{children}` con `PageTransition`.
  3. Implementar suite de integración E2E `instant-navigation-integration.test.tsx` simulando el flujo de navegación completo entre Dashboard (`/`), Compras (`/expenses`), Tarjetas (`/cards`) y Personas (`/persons`):
     - Detección de contacto táctil / hover y disparo de precarga en TanStack Query.
     - Activación optimista inmediata del tab en 0ms.
     - Inicio inmediato de `TopProgressBar` y avance orgánico.
     - Montaje del segmento `loading.tsx` sin congelamiento de pantalla previa.
     - Entrada suave del contenido final con `PageTransition`.
     - Culminación de la barra superior al 100% y desvanecimiento.
  4. Ejecución de la suite completa de pruebas del proyecto (`npm test`) y validación de linters y tipos.
- **Hecho cuando:**
  `npx vitest run src/components/layout/instant-navigation-integration.test.tsx` pasa en verde; todas las suites de prueba del proyecto (`npm test`) pasan al 100%; `npm run build`, `npm run lint` y `npm run typecheck` completan con 0 errores y 0 advertencias.
