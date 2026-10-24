# Plan Técnico 002 — Shell de Navegación Responsivo y Guardia de Onboarding Inicial (`002-onboarding-and-navigation-shell`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Especificación Relacionada:** [`specs/002-onboarding-and-navigation-shell/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/002-onboarding-and-navigation-shell/spec.md)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§3.2, §3.3, §4, §6), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`docs/resume.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume.md), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La implementación de la Spec 002 segrega estrictamente el layout del **App Shell** protegido (bajo el Route Group `src/app/(main)`) del layout limpio e independiente de **Onboarding** (bajo `src/app/onboarding`), conectando ambos mediante el hook de estado `useOnboardingStatus` y el componente de protección `OnboardingGuard`.

```text
web-credit-warrior/
├── src/
│   ├── app/
│   │   ├── (main)/                             # Route Group protegido por OnboardingGuard
│   │   │   ├── layout.tsx                      # App Shell: DesktopSidebar (desktop), AppHeader, BottomNav (mobile)
│   │   │   ├── page.tsx                        # Dashboard principal protegido (placeholder inicial Spec 002)
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx                    # Vista Compras protegida (placeholder inicial)
│   │   │   ├── cards/
│   │   │   │   └── page.tsx                    # Vista Tarjetas protegida (placeholder inicial)
│   │   │   └── persons/
│   │   │       └── page.tsx                    # Vista Personas protegida (placeholder inicial)
│   │   ├── onboarding/
│   │   │   ├── layout.tsx                      # Layout aislado, centrado, limpio, sin barras ni sidebar
│   │   │   └── page.tsx                        # Página de Onboarding con guardia inversa hacia '/'
│   │   ├── layout.tsx                          # Root Layout general (Fonts, QueryProvider, Toaster) - Spec 001
│   │   └── globals.css                         # Tokens semánticos y safe areas - Spec 001
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-header.tsx                  # Cabecera superior: título de página y health status dot
│   │   │   ├── bottom-nav.tsx                  # Barra inferior móvil fija, 4 destinos, botón '+', safe areas
│   │   │   ├── desktop-sidebar.tsx             # Sidebar lateral escritorio (>= 768px), logo, links, botón registrar
│   │   │   └── onboarding-guard.tsx            # Guardia de ruta: splash de carga, error de red anti-loop, redirección
│   │   └── ui/
│   │       ├── input.tsx                       # Primitiva de entrada de texto shadcn/ui
│   │       └── label.tsx                       # Primitiva de etiqueta de formulario shadcn/ui (Radix Label)
│   ├── features/
│   │   └── onboarding/
│   │       ├── components/
│   │       │   ├── first-card-step.tsx         # Paso 2: Formulario de primera tarjeta con ayuda visual
│   │       │   ├── first-persons-step.tsx      # Paso 3: Registro de participantes, selector color y bandeja
│   │       │   ├── step-indicator.tsx          # Indicador visual de progreso del asistente (1 de 3)
│   │       │   └── welcome-step.tsx            # Paso 1: Bienvenida, valor diferencial y CTA de inicio
│   │       └── onboarding-wizard.tsx           # Coordinador del asistente (estado step: 1 | 2 | 3, revisión)
│   └── hooks/
│       └── use-onboarding-status.ts            # Hook que consulta cards/persons activas y determina estado
```

---

## 2. Diseño UI/UX, Ergonómico y Aislamiento de Layouts

### 2.1 Aislamiento Estricto entre `(main)` y `/onboarding`
- **`src/app/(main)/layout.tsx`**: Contiene la estructura completa del App Shell:
  - En pantallas móviles (`< 768px`): `BottomNav` fija en el pie con `pb-[env(safe-area-inset-bottom,0px)]` y padding compensatorio inferior en el contenedor de contenido (`pb-20`).
  - En pantallas de escritorio (`>= 768px`): `DesktopSidebar` fijo a la izquierda (`w-64`), `AppHeader` en la parte superior y área principal de trabajo (`flex-1 overflow-y-auto`).
  - Todo el contenido dentro de `(main)` está envuelto por `<OnboardingGuard>`, impidiendo que cualquier usuario no configurado visualice el App Shell.
- **`src/app/onboarding/layout.tsx`**: Layout minimalista y autocontenido:
  - Contenedor a pantalla completa con `min-h-[100dvh]`, fondo obsidian `#090A0F`, sin `BottomNav`, sin `DesktopSidebar` y sin `AppHeader`.
  - Centrado óptico de los formularios con scroll vertical fluido para garantizar que el foco y la atención del usuario se concentren en completar la configuración.

### 2.2 Barra de Navegación Inferior Móvil (`BottomNav`)
- **Tokens y Contraste**: Superficie `#12141C` con borde superior `#232736` de `1px` y soporte para backdrop-blur.
- **4 Destinos Fijos**:
  1. `Dashboard` (`/`): Icono `LayoutDashboard` (`lucide-react`).
  2. `Compras` (`/expenses`): Icono `ReceiptText` (`lucide-react`).
  3. `Tarjetas` (`/cards`): Icono `CreditCard` (`lucide-react`).
  4. `Personas` (`/persons`): Icono `Users` (`lucide-react`).
- **Estado Activo**: Detectado en tiempo real mediante `usePathname()`. El destino activo resalta con texto `#F3F5F8` y un indicador visual inferior acentuado; los inactivos se muestran en `#8A93A6`.
- **Botón Central Prominente (`+`)**:
  - Elemento central circular elevado (`h-12 w-12 rounded-full`) con fondo acento esmeralda `#10B981`, icono `Plus` negro `#090A0F` y sombra difusa.
  - **Comportamiento en Spec 002**: Al ser presionado emite una notificación toast informativa mediante `sonner`:
    > *"El registro rápido de compras se habilitará en la siguiente fase de desarrollo"*
    (Reservando la apertura del drawer interactivo para la Spec 004).
- **Safe Areas**: Padding dinámico `pb-[env(safe-area-inset-bottom,0px)]` para evitar colisiones con la barra de gestos de iOS o Android.

### 2.3 Sidebar Lateral de Escritorio (`DesktopSidebar`) y Cabecera (`AppHeader`)
- **`DesktopSidebar`**:
  - Encabezado con isotipo y logotipo de Credit Warrior.
  - Menú vertical de navegación con hover sutil (`#1A1D28`), transición suave e indicador de ruta activa con barra lateral `#10B981`.
  - Botón primario *"Registrar gasto"* con icono `+`: emite el mismo toast informativo que el botón móvil en esta fase.
  - Pie del sidebar con información de versión (`v0.1.0`) y monitor de conexión.
- **`AppHeader`**:
  - Título dinámico que refleja la sección en curso según la ruta (`Dashboard`, `Historial de compras`, `Tarjetas de crédito`, `Participantes`).
  - Indicador de estado de conexión (`useHealthCheck`): punto verde esmeralda con pulso cuando el backend responde `200`, o indicador ámbar/rojo con etiqueta descriptiva ante fallas de conexión.

### 2.4 Ergonomía del Onboarding Wizard ante Teclado Virtual
- Uso de `100dvh` en contenedores raíz para responder a cambios dinámicos del viewport en navegadores móviles al desplegarse el teclado en pantalla.
- Campos de texto con margen de scroll automático (`scroll-margin-top: 80px`) para asegurar que el input activo y el botón de acción continúen visibles por encima del teclado.

---

## 3. Lógica del Guardia de Estado Inicial (`OnboardingGuard`) y Prevención de Loops

### 3.1 Hook `useOnboardingStatus` (`src/hooks/use-onboarding-status.ts`)
Consume en paralelo los hooks creados en Spec 001:
- `cardsQuery = useCards({ is_active: true })`
- `personsQuery = usePersons({ is_active: true })`

**Modelo de Estado**:
```typescript
export interface OnboardingStatusResult {
  isOnboarded: boolean;       // true sii (activeCardsCount >= 1 && activePersonsCount >= 1)
  isLoading: boolean;         // true mientras cardsQuery o personsQuery estén cargando
  isError: boolean;           // true si alguna de las dos consultas falló
  error: unknown;
  refetch: () => Promise<void>;
  initialStep: 1 | 2 | 3;     // 1: faltan ambas, 2: falta tarjeta, 3: falta persona
  activeCardsCount: number;
  activePersonsCount: number;
}
```

- **Regla del Paso Inicial (`initialStep`)**:
  - Si `activeCardsCount === 0 && activePersonsCount === 0` -> `step: 1` (Bienvenida).
  - Si `activeCardsCount === 0 && activePersonsCount > 0` -> `step: 2` (Primera Tarjeta).
  - Si `activeCardsCount > 0 && activePersonsCount === 0` -> `step: 3` (Participantes).

### 3.2 Componente `OnboardingGuard` (`src/components/layout/onboarding-guard.tsx`)
Envuelve el contenido de las rutas protegidas en `src/app/(main)/layout.tsx`:
1. **Estado `isLoading`**: Renderiza una pantalla de espera en `#090A0F` con el logo de Credit Warrior y un spinner o pulso sutil de carga, evitando cualquier renderizado prematuro del App Shell (*Zero FOUC*).
2. **Estado `isError` (Prevención de Loops de Redirección)**:
   - Si la consulta de red falla (`status: 0`, timeout o error `500`), el guardia **NO redirige** a `/onboarding`.
   - Renderiza una vista centrada de error de conectividad con icono de alerta (`WifiOff`), mensaje *"No fue posible conectar con el servidor de Credit Warrior"* y botón primario *"Reintentar conexión"* que invoca `refetch()`.
3. **Estado `!isOnboarded`**: Dispara `router.replace('/onboarding')` inmediatamente.
4. **Estado `isOnboarded`**: Renderiza los componentes hijos (`children`).

### 3.3 Guardia Inversa en `/onboarding/page.tsx`
Si un usuario que ya cuenta con `activeCardsCount >= 1 && activePersonsCount >= 1` ingresa manualmente a `/onboarding`, la página evalúa `isOnboarded` y dispara `router.replace('/')`, impidiendo el reingreso accidental.

---

## 4. Flujo Detallado del Asistente de Onboarding (`OnboardingWizard`)

El asistente se coordina mediante el componente `OnboardingWizard` gestionando su paso en estado local de React (`step: 1 | 2 | 3`).

### 4.1 Paso 1 — Bienvenida (`WelcomeStep`)
- **Propósito**: Contextualizar al usuario sin pedir datos.
- **Contenido**: Logotipo, titular *"Tus tarjetas compartidas, sin enredos de cuentas"*, 3 ventajas clave con iconos descriptivos (división de cuotas en períodos, soporte multimoneda CLP/USD, precisión decimal sin cálculos manuales).
- **Acción**: Botón primario *"Comenzar configuración"* que actualiza el estado a `step: 2`.

### 4.2 Paso 2 — Creación de Primera Tarjeta (`FirstCardStep`)
- **Formulario**: `react-hook-form` integrado con `cardCreateSchema` (Zod `.strict()`).
  - `name`: Input de texto obligatorio (1..100 caracteres).
  - `last_four_digits`: Input de texto opcional con validación de 4 dígitos (`^\d{4}$`).
  - `currency`: Selector segmentado de dos botones (`CLP` o `USD`), con badges visuales de color (`#10B981` y `#38BDF8`).
  - `closing_day` y `due_day`: Inputs numéricos obligatorios (1..31).
- **Cápsula Informativa de Fechas**: Cuadro explicativo con borde `#232736` y fondo `#1A1D28` que aclara la diferencia entre día de corte y día límite de pago.
- **Modo Lectura / Revisión**:
  - Si el usuario retrocede al Paso 2 desde el Paso 3 (*"Revisar tarjeta creada"*), los campos se presentan en modo lectura/deshabilitados con los datos de la tarjeta recién creada.
  - El botón principal cambia a *"Continuar a participantes"*, avanzando a `step: 3` sin disparar llamadas `POST` redundantes.
- **Envío**: Al pulsar *"Guardar tarjeta y continuar"* (en creación), invoca `useCreateCard.mutateAsync()`. Ante respuesta exitosa (`201 Created`), almacena los datos de la tarjeta en memoria, muestra toast de éxito y avanza a `step: 3`.

### 4.3 Paso 3 — Creación de Participantes y Selector de Color (`FirstPersonsStep`)
- **Formulario Rápido**: `react-hook-form` con `personCreateSchema`.
  - `name`: Input de texto obligatorio (1..100 caracteres).
  - **Selector de Color**: Fila de opciones circulares con colores predefinidos de alto contraste sobre fondo oscuro:
    - Verde Esmeralda (`#10B981`)
    - Azul Cielo (`#38BDF8`)
    - Violeta Real (`#8B5CF6`)
    - Ámbar Cálido (`#F59E0B`)
    - Rosa Carmín (`#F43F5E`)
    - Aguamarina (`#14B8A6`)
    - **Opción Neutra**: Envía explícitamente `color_hex: null` al backend en el payload de `PersonCreate`, y la UI renderiza el fallback `#8A93A6`.
- **Bandeja de Participantes Creados**:
  - Renderiza una lista dinámica de las personas creadas en esta sesión.
  - Cada participante se muestra con el componente `PersonChip` (creado en Spec 001).
  - Incluye un botón de eliminación en cada píldora (`[ x ]`) que invoca `useDeletePerson.mutateAsync(personId)`. Al eliminarse, la lista se actualiza inmediatamente.
- **Manejo de Error `409 Conflict` (Nombre Duplicado)**:
  - Si el backend rechaza la creación con `409 Conflict`, el helper `form.setError('name', { message: 'Ya existe una persona registrada con este nombre' })` resalta el campo en rojo `#F43F5E` con el mensaje inline sin resetear el color seleccionado.
- **Navegación de Retroceso**: Botón secundario *"Revisar tarjeta creada"* que traslada la vista al Paso 2 en modo lectura.
- **Botón de Finalización**:
  - Botón primario *"Finalizar y ver Dashboard"*.
  - **Condición**: Permanece estrictamente deshabilitado si la bandeja de participantes tiene `0` elementos. Se habilita de forma prominente cuando hay **al menos 1 participante activo**.

### 4.4 Finalización e Invalidación en Cascada
Al pulsar *"Finalizar y ver Dashboard"*:
1. Dispara `Promise.all([`
   - `queryClient.invalidateQueries({ queryKey: queryKeys.cards.all })`,
   - `queryClient.invalidateQueries({ queryKey: queryKeys.persons.all })`,
   - `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`
   `])`
2. Muestra un toast celebratorio: *"¡Configuración inicial completada con éxito!"*.
3. Ejecuta `router.replace('/')`.
4. El guardia de `(main)` detecta que `isOnboarded === true` y da acceso inmediato al Dashboard.

---

## 5. Primitivas UI a Implementar (`src/components/ui/`)

Para soportar los formularios del asistente y los layouts, se crearán las primitivas estándar basadas en Radix UI y Tailwind v4:
1. **`src/components/ui/input.tsx`**: Input accesible con estilos dark mode (`bg-[#1A1D28]`, borde `#232736`, texto `#F3F5F8`, `focus-visible:ring-1 focus-visible:ring-[#10B981]`, estado de error con borde `#F43F5E`).
2. **`src/components/ui/label.tsx`**: Componente Label accesible basado en `@radix-ui/react-label`.

---

## 6. Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Organización de Layouts** | **Route Group `(main)`** segregado de `/onboarding`. | Layout condicional único en `root` con `if (pathname === '/onboarding')`. | Separar en Route Groups de Next.js 15 garantiza aislamiento completo de estilos, evita re-renders innecesarios de barras de navegación y previene fugas de componentes de navegación en el onboarding. |
| **Prevención de Loops en Guardia** | Pantalla de reconexión in-situ con botón *"Reintentar conexión"* ante fallas de red. | Redirigir a `/onboarding` cuando las consultas de tarjetas/personas fallan. | Si el backend está temporalmente caído, redirigir a `/onboarding` provocaría que el onboarding tampoco pueda operar, generando confusión y ciclos continuos de redirección. |
| **Gestión de Pasos del Wizard** | Estado React local (`step: 1 \| 2 \| 3`) coordinado en `OnboardingWizard`. | Navegación por URL interna (`/onboarding/step-1`, `/onboarding/step-2`). | El onboarding es un flujo atómico de una sola sesión de bienvenida; el estado en memoria simplifica transiciones suaves, previene accesos desordenados por URL directa y permite navegación de revisión sin recargas. |
| **Revisión de Tarjeta en Paso 3** | Botón de retroceso al Paso 2 en **modo lectura** sin reenviar `POST`. | Volver a permitir enviar el formulario de tarjeta o resetearla. | La tarjeta ya fue creada en el backend (`201 Created`). Permitir volver a enviarla crearía una segunda tarjeta duplicada. El modo lectura permite verificar los datos sin mutaciones indebidas. |
| **Disparador `+` en Spec 002** | Toast informativo *"El registro rápido se habilitará en la siguiente fase"*. | Abrir un drawer vacío preliminar o botón deshabilitado. | Mantiene el elemento interactivo activo y accesible en el shell de navegación respetando la ergonomía táctil, mientras que el drawer completo con selección de splits corresponde a la Spec 004. |
| **Color Neutro en Participantes** | Envío de `color_hex: null` en `PersonCreate` y fallback visual `#8A93A6`. | Forzar un color hexadecimal por defecto en el payload (ej. `#8A93A6`). | `docs/openapi.json` define `color_hex` como anulable (`string \| null`). Respetar `null` preserva el estándar del dominio y permite que la API distinga participantes sin personalización cromática. |

---

## 7. Estrategia de Tests y TDD

Siguiendo el principio de desarrollo guiado por pruebas (TDD), cada módulo contará con su suite de pruebas en Vitest + React Testing Library:

1. **`src/hooks/use-onboarding-status.test.ts`**:
   - Cubre **RF-03**, **RF-04**.
   - Pruebas para:
     - Estado de carga (`isLoading: true`).
     - Estado de error ante falla de red (`isError: true`, no loop).
     - Catálogos vacíos (`cards: 0, persons: 0` -> `isOnboarded: false, initialStep: 1`).
     - Catálogo parcial con solo personas (`cards: 0, persons: 2` -> `initialStep: 2`).
     - Catálogo parcial con solo tarjetas (`cards: 1, persons: 0` -> `initialStep: 3`).
     - Onboarding completado (`cards: 1, persons: 1` -> `isOnboarded: true`).
2. **`src/components/layout/onboarding-guard.test.tsx`**:
   - Cubre **RF-03**, **RF-09**.
   - Pruebas para:
     - Renderizado de splash de carga oscuro `#090A0F`.
     - Renderizado de pantalla de error de conexión ante fallo de red con botón de reintento.
     - Redirección automática a `/onboarding` cuando `isOnboarded === false`.
     - Renderizado de `children` cuando `isOnboarded === true`.
3. **`src/components/layout/bottom-nav.test.tsx`**:
   - Cubre **RF-01**, **RF-10**.
   - Pruebas para:
     - Renderizado de los 4 destinos de navegación y verificación de rutas.
     - Resaltado visual del enlace activo según el `pathname` actual.
     - Clic en el botón central `+` dispara el toast informativo.
     - Verificación de clases para safe areas (`pb-[env(safe-area-inset-bottom,0px)]`).
4. **`src/components/layout/desktop-sidebar.test.tsx` y `app-header.test.tsx`**:
   - Cubre **RF-02**, **RF-10**.
   - Pruebas para:
     - Renderizado de enlaces en escritorio, logotipo y botón de acción.
     - Cabecera con título dinámico sincronizado y estado de salud online/offline.
5. **`src/features/onboarding/onboarding-wizard.test.tsx`**:
   - Cubre **RF-05**, **RF-06**, **RF-07**, **RF-08**, **RF-09**.
   - Pruebas para:
     - Transición de Paso 1 a Paso 2 tras clic en *"Comenzar configuración"*.
     - Validación del formulario de tarjeta en Paso 2 (campos obligatorios y días 1..31).
     - Creación exitosa de tarjeta avanza automáticamente al Paso 3.
     - Registro de participante con color personalizado y con opción neutra (`color_hex: null`).
     - Eliminación de participante de la lista vía `DELETE`.
     - Botón de finalización deshabilitado con 0 participantes y habilitado con >= 1.
     - Retroceso a Paso 2 en modo lectura (*"Revisar tarjeta creada"*) sin re-envío de `POST`.
     - Manejo de error `409 Conflict` por nombre de participante duplicado.
     - Clic en *"Finalizar y ver Dashboard"* invalida `cards.all`, `persons.all`, `dashboard.all` y redirige a `/`.
