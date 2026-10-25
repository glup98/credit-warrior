# Tareas de Implementación 003 — Gestión de Tarjetas y Personas: Catálogos Maestros y Archivado Inteligente (`003-cards-and-persons-management`)

- **Estado:** completada
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Plan Técnico:** [`specs/003-cards-and-persons-management/plan.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/003-cards-and-persons-management/plan.md)
- **Especificación Relacionada:** [`specs/003-cards-and-persons-management/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/003-cards-and-persons-management/spec.md) (v1.1.0)

---

## Tareas Secuenciales Atómicas (T1 a T10)

### [x] T1: Primitivas UI Base de Interacción (`Tabs`, `Dialog`, `Drawer`, `AlertDialog`, `DropdownMenu`, `Switch`)
- **RFs cubiertos:** RF-01, RF-02, RF-04, RF-05, RF-06, RF-09, RF-10
- **Archivos involucrados:**
  - `src/components/ui/tabs.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/drawer.tsx`
  - `src/components/ui/alert-dialog.tsx`
  - `src/components/ui/dropdown-menu.tsx`
  - `src/components/ui/switch.tsx`
  - `src/components/ui/ui-interaction.test.tsx`
- **Descripción:**
  Implementar las primitivas estándar accesibles basadas en Radix UI y Vaul adaptadas a la paleta Obsidian Ink:
  1. `Tabs`: Selector de pestañas accesible con foco por teclado y estado activo acentuado.
  2. `Dialog`: Modal centrado accesible para pantallas de escritorio (`>= 768px`) con backdrop blur.
  3. `Drawer`: Panel inferior deslizable para pantallas móviles (`< 768px`) con drag handle y soporte para safe areas.
  4. `AlertDialog`: Modal de confirmación con variantes destructiva y de alerta.
  5. `DropdownMenu`: Menú contextual flotante para acciones de tarjeta y persona.
  6. `Switch`: Interruptor accesible para control del estado booleano `is_active`.
  Escribir pruebas unitarias en `ui-interaction.test.tsx` verificando renderizado, interacción y accesibilidad.
- **Hecho cuando:**
  `npx vitest run src/components/ui/ui-interaction.test.tsx` pasa en verde con Vitest probando renderizado y accesibilidad de cada primitiva; `npx tsc --noEmit` y `npm run lint` reportan 0 errores.

---

### [x] T2: Módulo Tarjetas: Componente `CardItem` y Diálogo de Confirmación de Eliminación (TDD)
- **RFs cubiertos:** RF-01, RF-03, RF-04, RF-10
- **Archivos involucrados:**
  - `src/features/cards/components/card-item.tsx`
  - `src/features/cards/components/delete-card-confirm-dialog.tsx`
  - `src/features/cards/components/card-item.test.tsx`
- **Descripción:**
  1. Implementar `CardItem`: Ficha visual de tarjeta con superficie `#12141C`, borde `#232736`, nombre, últimos 4 dígitos enmascarados `•••• 1234` (o limpio si es null), `CurrencyBadge` (`CLP`/`USD`), metadatos de días de corte y pago, badge de estado Activa/Archivada y menú de acciones `DropdownMenu` (*"Editar"*, *"Archivar/Activar"*, *"Eliminar"*).
  2. Conectar la acción rápida de archivar/reactivar con `useUpdateCard` enviando `{ is_active: !card.is_active }` con toast confirmatorio e invalidación en cascada de `cards.all` y `dashboard.all`.
  3. Implementar `DeleteCardConfirmDialog`: Modal de confirmación destructiva que alerta sobre la eliminación definitiva y dispara el callback de eliminación.
- **Hecho cuando:**
  `src/features/cards/components/card-item.test.tsx` pasa en verde probando renderizado de datos, formateo de tarjeta, acción de alternar estado `is_active` y apertura del diálogo de confirmación de eliminación; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T3: Módulo Tarjetas: Diálogo de Archivado Inteligente ante `409 Conflict` (TDD)
- **RFs cubiertos:** RF-04, RF-10
- **Archivos involucrados:**
  - `src/features/cards/components/archive-card-alert-dialog.tsx`
  - `src/features/cards/components/archive-card-alert-dialog.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `ArchiveCardAlertDialog` que se abre cuando el intento de eliminación de una tarjeta retorna `409 Conflict`:
  1. Despliega el título explicativo *"Esta tarjeta tiene compras asociadas"* y el mensaje de preservación histórica.
  2. Botón primario *"Archivar tarjeta"* que dispara `useUpdateCard` con `{ is_active: false }`:
     - Entra en estado `isPending` con spinner y deshabilita botones del diálogo.
     - Ante éxito: cierra el diálogo, invalida en cascada `cards.all` y `dashboard.all`, y muestra toast confirmatorio.
     - Ante fallo de red o error de servidor: el diálogo NO se cierra, muestra toast de error y permite al usuario reintentar la acción.
  3. Botón secundario *"Cancelar"* que cierra el diálogo sin mutaciones.
- **Hecho cuando:**
  `src/features/cards/components/archive-card-alert-dialog.test.tsx` pasa en verde con pruebas para el estado de carga, la mutación `PATCH { is_active: false }`, la invalidación en cascada y el reintento in-situ ante fallo de red; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T4: Módulo Tarjetas: `CardFormDialog` Adaptativo con Normalización y Errores `422` (TDD)
- **RFs cubiertos:** RF-02, RF-10
- **Archivos involucrados:**
  - `src/features/cards/components/card-form-dialog.tsx`
  - `src/features/cards/components/card-form-dialog.test.tsx`
- **Descripción:**
  Implementar el formulario adaptativo de alta y edición de tarjetas:
  1. Renderiza `Dialog` en desktop (`>= 768px`) y `Drawer` en mobile (`< 768px`).
  2. Formulario con `react-hook-form` y Zod (`cardCreateSchema` en creación, `cardUpdateSchema` en edición).
  3. Campos: `name`, `last_four_digits`, selector segmentado de moneda `CLP`/`USD` con `CurrencyBadge`, `closing_day` (1..31), `due_day` (1..31) y switch `is_active`.
  4. Nota contextual de UX sobre ajuste de corte en meses cortos para el día 31.
  5. **Normalización en edición**: Si el usuario borra `last_four_digits` dejándolo en `""`, se normaliza a `null` antes de enviar el `PATCH`.
  6. Mapeo de errores de validación `422` inyectando el mensaje bajo cada input mediante `mapPydanticErrorsToForm`.
  7. Al guardar exitosamente, invalida `cards.all` y `dashboard.all`, cierra el formulario y emite toast de éxito.
- **Hecho cuando:**
  `src/features/cards/components/card-form-dialog.test.tsx` pasa en verde validando altas, ediciones, normalización de `last_four_digits: ""` a `null`, mapeo de errores `422` e invalidación en cascada; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T5: Módulo Tarjetas: `CardList`, `CardsView` con Sincronización en URL y Página `/cards` (TDD)
- **RFs cubiertos:** RF-01, RF-03, RF-04
- **Archivos involucrados:**
  - `src/features/cards/components/card-list.tsx`
  - `src/features/cards/cards-view.tsx`
  - `src/app/(main)/cards/page.tsx`
  - `src/features/cards/cards-view.test.tsx`
- **Descripción:**
  1. Implementar `CardList`: Pestañas Activas / Archivadas / Todas sincronizadas con `?status=active|archived|all`, cálculo de contadores en memoria a partir de `useCards()`, renderizado de grilla de `CardItem`, y `EmptyState` cuando la lista está vacía.
  2. Implementar `CardsView`: Coordinador que enlaza la lista, el botón *"Nueva tarjeta"*, el modal de alta/edición, el diálogo de confirmación de eliminación (con manejo de `404 Not Found` refrescando el catálogo) y el diálogo de Archivado Inteligente ante captura de `409 Conflict`.
  3. Asegurar tolerancia a 0 tarjetas activas: Si se archiva la última tarjeta activa en `/cards`, permanece en pantalla mostrando `EmptyState` sin redirigir a `/onboarding`.
  4. Montar `CardsView` en `src/app/(main)/cards/page.tsx` envuelto en `Suspense`.
- **Hecho cuando:**
  `src/features/cards/cards-view.test.tsx` pasa en verde con pruebas completas de sincronización en URL, apertura de modales, eliminación física exitosa, captura de 409 abriendo archivado inteligente, y permanencia en `EmptyState` ante 0 activas; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T6: Módulo Personas: `ColorPicker` Accesible y Componente `PersonItem` (TDD)
- **RFs cubiertos:** RF-05, RF-07, RF-10
- **Archivos involucrados:**
  - `src/features/persons/components/color-picker.tsx`
  - `src/features/persons/components/person-item.tsx`
  - `src/features/persons/components/person-components.test.tsx`
- **Descripción:**
  1. Implementar `ColorPicker`: Paleta de 8 colores vibrantes de alto contraste (`#10B981`, `#38BDF8`, `#8B5CF6`, `#F59E0B`, `#F43F5E`, `#14B8A6`, `#FB923C`, `#6366F1`) más botón *"Neutro"* explícito que asigna `null`. Cada botón circular tiene target táctil accesible `>= 44px`, anillo de foco visible y check interior en el seleccionado.
  2. Implementar `PersonItem`: Ficha de participante con avatar circular o píldora con `color_hex` (o fallback neutro `#8A93A6`), nombre con truncamiento elíptico, badge de estado Activo/Archivado y menú de acciones `DropdownMenu` (*"Editar"*, *"Archivar/Activar"*, *"Eliminar"*).
  3. Conectar la acción rápida de archivar/reactivar con `useUpdatePerson` enviando `{ is_active: !person.is_active }`, invalidando `persons.all` y `dashboard.all`.
- **Hecho cuando:**
  `src/features/persons/components/person-components.test.tsx` pasa en verde probando selección de color, opción neutra enviando `null`, renderizado de avatar y toggle de estado de actividad; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T7: Módulo Personas: Diálogo de Archivado Inteligente ante `409 Conflict` (TDD)
- **RFs cubiertos:** RF-09, RF-10
- **Archivos involucrados:**
  - `src/features/persons/components/archive-person-alert-dialog.tsx`
  - `src/features/persons/components/archive-person-alert-dialog.test.tsx`
- **Descripción:**
  Implementar mediante TDD el componente `ArchivePersonAlertDialog` que se abre cuando el intento de eliminación de una persona retorna `409 Conflict` (debido a participaciones en compras):
  1. Despliega el título explicativo *"Esta persona tiene gastos asociados"* y el mensaje de preservación histórica.
  2. Botón primario *"Archivar persona"* que dispara `useUpdatePerson` con `{ is_active: false }`:
     - Entra en estado `isPending` con spinner y deshabilita botones.
     - Ante éxito: cierra el diálogo, invalida en cascada `persons.all` y `dashboard.all`, y muestra toast confirmatorio.
     - Ante fallo de red o error de servidor: el diálogo NO se cierra, muestra toast de error y permite al usuario reintentar la acción.
  3. Botón secundario *"Cancelar"* que cierra el diálogo sin mutaciones.
- **Hecho cuando:**
  `src/features/persons/components/archive-person-alert-dialog.test.tsx` pasa en verde con pruebas para el estado de carga, la mutación `PATCH { is_active: false }`, la invalidación en cascada y el reintento in-situ ante fallo de red; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T8: Módulo Personas: `PersonFormDialog` con Mapeo Inline de Conflicto `409` y `422` (TDD)
- **RFs cubiertos:** RF-06, RF-07, RF-08, RF-10
- **Archivos involucrados:**
  - `src/features/persons/components/person-form-dialog.tsx`
  - `src/features/persons/components/person-form-dialog.test.tsx`
- **Descripción:**
  Implementar el formulario adaptativo de alta y edición de personas:
  1. Renderiza `Dialog` en desktop y `Drawer` en mobile.
  2. Formulario con `react-hook-form` y Zod (`personCreateSchema` en creación, `personUpdateSchema` en edición).
  3. Campos: `name` (con trim automático), `ColorPicker` con opción neutra explícita y switch `is_active`.
  4. **Mapeo de Conflicto `409 Conflict`**: Si la API responde `409` (nombre duplicado), captura el error e inyecta el mensaje directamente bajo el campo `name` (*"Ya existe una persona registrada con este nombre"*), preservando el color seleccionado y el estado del formulario.
  5. Mapeo de errores `422` mediante `mapPydanticErrorsToForm`.
  6. Al guardar exitosamente, invalida `persons.all` y `dashboard.all`, cierra el formulario y emite toast de éxito.
- **Hecho cuando:**
  `src/features/persons/components/person-form-dialog.test.tsx` pasa en verde validando altas, ediciones, selector de color, captura y mapeo de `409` sobre el campo `name` sin perder el color, y errores `422`; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T9: Módulo Personas: `PersonList`, `PersonsView` con Sincronización en URL y Página `/persons` (TDD)
- **RFs cubiertos:** RF-05, RF-08, RF-09
- **Archivos involucrados:**
  - `src/features/persons/components/person-list.tsx`
  - `src/features/persons/components/delete-person-confirm-dialog.tsx`
  - `src/features/persons/persons-view.tsx`
  - `src/app/(main)/persons/page.tsx`
  - `src/features/persons/persons-view.test.tsx`
- **Descripción:**
  1. Implementar `PersonList`: Pestañas Activas / Archivadas / Todas sincronizadas con `?status=active|archived|all`, contadores en memoria a partir de `usePersons()`, grilla de `PersonItem` y `EmptyState` cuando la lista está vacía.
  2. Implementar `DeletePersonConfirmDialog`: Modal de confirmación destructiva previa.
  3. Implementar `PersonsView`: Coordinador que enlaza la lista, el botón *"Nueva persona"*, el modal de alta/edición, el diálogo de confirmación de eliminación (con manejo de `404 Not Found` refrescando el catálogo) y el diálogo de Archivado Inteligente ante captura de `409 Conflict`.
  4. Tolerancia a 0 personas activas: Si se archiva la última persona activa en `/persons`, permanece en pantalla mostrando `EmptyState` sin expulsar al usuario.
  5. Montar `PersonsView` en `src/app/(main)/persons/page.tsx` envuelto en `Suspense`.
- **Hecho cuando:**
  `src/features/persons/persons-view.test.tsx` pasa en verde con pruebas completas de sincronización en URL, apertura de modales, eliminación física exitosa, captura de 409 abriendo archivado inteligente, y permanencia en `EmptyState` ante 0 activas; `tsc --noEmit` y `lint` en 0 errores.

---

### [x] T10: Verificación Integral End-to-End, Auditoría de Calidad y Actualización de MEMORY.md
- **RFs cubiertos:** RF-01 a RF-10
- **Archivos involucrados:**
  - `MEMORY.md`
  - Todas las suites de prueba de tarjetas y personas
- **Descripción:**
  1. Ejecutar la suite completa de pruebas unitarias y de integración (`npm test`).
  2. Ejecutar la verificación estática de tipos (`npm run typecheck`).
  3. Ejecutar el linter (`npm run lint`).
  4. Ejecutar la compilación de producción (`npm run build`) para verificar la correcta integración de rutas y Suspense boundaries en Next.js 15.
  5. Auditar el cumplimiento riguroso de los 10 requisitos funcionales de la especificación `003-cards-and-persons-management`.
  6. Actualizar `MEMORY.md`: registrar el progreso de la Spec 003 como completada (`10 / 10`), actualizar el estado de los contratos de Cards y Persons a completados, y habilitar la transición a Spec 004.
- **Hecho cuando:**
  100% de los tests en Vitest pasan en verde, `npm run typecheck`, `npm run lint` y `npm run build` terminan con 0 errores y 0 advertencias, y `MEMORY.md` queda actualizado reflejando la finalización de la Spec 003.
