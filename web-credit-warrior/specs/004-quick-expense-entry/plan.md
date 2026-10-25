# Plan Técnico 004 — Registro Ultra-Rápido de Gastos: Drawer Global, Adaptación de Moneda y Constructor de Repartos (`004-quick-expense-entry`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-20
- **Especificación Relacionada:** [`specs/004-quick-expense-entry/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/004-quick-expense-entry/spec.md) (v1.1.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§3.4, §4.1, §4.2, §5.1, §5.2), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`docs/resume.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume.md), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura técnica para la Spec 004 implementa el flujo de registro rápido de compras compartidas dentro del módulo `src/features/expenses/`, integrando contexto de visibilidad global, adaptadores responsivos (Drawer en móvil y Dialog en escritorio), selectores ergonómicos, constructor modular de repartos (*splits*) y enlace con los disparadores del shell de la aplicación.

```text
web-credit-warrior/
├── src/
│   ├── app/
│   │   └── (main)/
│   │       └── layout.tsx                      # Inyección de QuickExpenseProvider y renderizado de QuickExpenseDrawer
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-header.tsx                  # Integración de botón secundario "Registrar gasto" en escritorio
│   │   │   ├── bottom-nav.tsx                  # Enlace del botón central destacado '+' al QuickExpenseContext
│   │   │   └── desktop-sidebar.tsx             # Enlace del botón primario "Registrar gasto" al QuickExpenseContext
│   │   └── ui/
│   │       └── textarea.tsx                    # Primitiva accesible de Textarea con tokens semánticos Dark Mode
│   ├── features/
│   │   └── expenses/
│   │       ├── components/
│   │       │   ├── card-select-chips.tsx       # Selector táctil de tarjetas activas con máscara y badge de moneda
│   │       │   ├── expense-split-builder.tsx   # Constructor unificado de repartos (EQUAL, PERCENTAGE, FIXED_AMOUNT)
│   │       │   ├── fixed-split-balance.tsx     # Indicador de saldo restante ($) y botón "Asignar restante"
│   │       │   ├── percentage-split-balance.tsx# Barra interactiva de balance (%) y botón "Distribuir equitativo"
│   │       │   ├── quick-expense-drawer.tsx    # Modal adaptativo (Drawer móvil / Dialog desktop) con dismissible condicional
│   │       │   └── quick-expense-form.tsx      # Formulario reactivo React Hook Form con Zod .strict() y normalización
│   │       ├── context/
│   │       │   └── quick-expense-context.tsx   # Estado global efímero (isOpen, open, close) para los disparadores
│   │       └── hooks/
│   │           └── use-quick-expense-keyboard.ts # Listener global para atajos Alt+N / N con exclusión de foco en inputs
│   ├── hooks/
│   │   └── queries/
│   │       ├── use-cards.ts                    # useCards({ is_active: true }) para tarjetas vigentes
│   │       ├── use-expenses.ts                 # useCreateExpense con invalidación en cascada a dashboard.all
│   │       └── use-persons.ts                  # usePersons({ is_active: true }) para participantes vigentes
│   ├── lib/
│   │   ├── formatters.ts                       # toCents, formatCurrency, formatMaskedCard, formatLocalDate
│   │   ├── query-keys.ts                       # queryKeys.expenses y queryKeys.dashboard
│   │   └── utils.ts                            # mapPydanticErrorsToForm y cn()
│   └── schemas/
│       └── expense.schema.ts                   # expenseCreateSchema (.strict()), superRefine y DTOs
```

---

## 2. Mapeo de Endpoints OpenAPI y Estrategia de Caché

### 2.1 Mapeo de Endpoints Consumidos

| Operación | Método y Endpoint | Esquema Request / Parámetros | Hook Consumido | Comportamiento y Códigos Esperados |
| :--- | :--- | :--- | :--- | :--- |
| **Tarjetas Activas** | `GET /api/v1/cards` | `is_active=true` | `useCards({ is_active: true })` | `200 OK` retornando `CardRead[]`. Si `length === 0`, muestra banner orientativo. |
| **Personas Activas** | `GET /api/v1/persons` | `is_active=true` | `usePersons({ is_active: true })` | `200 OK` retornando `PersonRead[]`. Si `length === 0`, muestra banner orientativo y bloquea guardado. |
| **Crear Gasto** | `POST /api/v1/expenses` | `ExpenseCreate` (`.strict()`) | `useCreateExpense()` | `201 Created` retornando `ExpenseRead`. Errores: `404` (concurrencia), `422` (validación). |

### 2.2 Estrategia de Invalidación en Cascada
Al recibir `201 Created` desde `POST /api/v1/expenses`, la mutación `useCreateExpense` ya implementada en `src/hooks/queries/use-expenses.ts` dispara automáticamente:
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
```
Esto actualiza de inmediato el resumen mensual (`dashboard.summary`), las proyecciones financieras (`dashboard.projection`) y el historial de compras (`expenses.list`), asegurando coherencia instantánea sin recarga de página.

---

## 3. Esquemas Zod Estrictos, Normalización y Manejo de Formularios

### 3.1 Esquema `expenseCreateSchema` y Cumplimiento con Pydantic V2
El esquema `expenseCreateSchema` definido en `src/schemas/expense.schema.ts` utiliza `.strict()` para cumplir con la regla de backend `extra="forbid"` (`additionalProperties: false`):
1. **`card_id`**: `z.string().uuid()` obligatorio.
2. **`description`**: `z.string().trim().min(1).max(255)`.
3. **`total_amount`**: `z.string().regex(decimalStringRegex).refine((v) => Number(v) > 0)`.
4. **`purchase_date`**: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.
5. **`installments_count`**: `z.coerce.number().int().min(1).max(120).default(1)`.
6. **`first_billing_override`**: `z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional()`.
7. **`notes`**: `z.string().max(2000).nullable().optional()`.
8. **`splits`**: `z.array(expenseSplitInputSchema).min(1)`.
   - `superRefine` verifica:
     - Sin repetición de `person_id`.
     - Todos los splits con el mismo `split_type`.
     - Si `split_type === "PERCENTAGE"`, suma exacta en centésimas = 10000 (`100.00%`).
     - Si `split_type === "FIXED_AMOUNT"`, suma de centavos = `toCents(total_amount)`.

### 3.2 Reglas de Normalización de Carga Útil (Payload Cleaning)
Antes de enviar los datos al mutador `useCreateExpense.mutateAsync(cleanedPayload)`, la capa del formulario aplica las siguientes transformaciones estrictas:
```typescript
function cleanExpensePayload(rawValues: FormExpenseValues): ExpenseCreate {
  const isOverrideEmpty = !rawValues.first_billing_override || rawValues.first_billing_override.trim() === '';
  const areNotesEmpty = !rawValues.notes || rawValues.notes.trim() === '';

  const cleanedSplits = rawValues.splits.map((split) => {
    if (split.split_type === 'EQUAL') {
      return {
        person_id: split.person_id,
        split_type: 'EQUAL' as const,
        percentage: null,
        fixed_amount: null,
      };
    }
    if (split.split_type === 'PERCENTAGE') {
      return {
        person_id: split.person_id,
        split_type: 'PERCENTAGE' as const,
        percentage: split.percentage ? split.percentage.trim() : null,
        fixed_amount: null,
      };
    }
    return {
      person_id: split.person_id,
      split_type: 'FIXED_AMOUNT' as const,
      percentage: null,
      fixed_amount: split.fixed_amount ? split.fixed_amount.trim() : null,
    };
  });

  return {
    card_id: rawValues.card_id,
    description: rawValues.description.trim(),
    total_amount: rawValues.total_amount.trim(),
    purchase_date: rawValues.purchase_date,
    installments_count: Number(rawValues.installments_count) || 1,
    first_billing_override: isOverrideEmpty ? null : rawValues.first_billing_override.trim(),
    notes: areNotesEmpty ? null : rawValues.notes.trim(),
    splits: cleanedSplits,
  };
}
```

### 3.3 Mapeo Inline de Errores `422` y Manejo de `404` / Red
- **Error `422 Unprocessable Entity`**: Se invoca `mapPydanticErrorsToForm(error, form.setError)`. Los errores de `description`, `total_amount`, `purchase_date`, `first_billing_override`, `notes` o `splits.${index}.${field}` se inyectan automáticamente en React Hook Form, resaltando el control en `#F43F5E` con texto descriptivo inferior.
- **Error `404 Not Found`**: Toast de advertencia (*"La tarjeta o uno de los participantes seleccionados ya no existe"*). Se invalidan `cards.all` y `persons.all` para actualizar opciones. El modal permanece abierto.
- **Error de Red o `500`**: Toast de advertencia (*"Error de conexión con el servidor. Tus datos están a salvo; reintenta"*). El modal **permanece abierto** con todos los datos intactos para reintento inmediato.

---

## 4. Diseño UI/UX y Sistema de Interacción

### 4.1 Puntos de Entrada y Atajos de Teclado
- **Móvil (`< 768px`)**: Botón central en `BottomNav` con icono `+`, área táctil `48x48px`, fondo `accent-clp` y elevación visual.
- **Escritorio (`>= 768px`)**:
  - Botón primario en `DesktopSidebar` con icono `+` y texto *"Registrar gasto"*.
  - Botón secundario en `AppHeader`.
  - Atajo de teclado: `Alt+N` o pulsación simple de `N`.
  - **Exclusión Estricta**: Listener en `window` verifica si `event.target` es un elemento editable (`tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable`). Si es editable, el evento se ignora.

### 4.2 Modal Adaptativo (`QuickExpenseDrawer`)
- En escritorio (`>= 768px`): Renderiza `Dialog` centrado (`max-w-lg`) con scroll interno y `backdrop-blur-md`.
- En móvil (`< 768px`): Renderiza `Drawer` (Vaul) con arrastre hacia abajo y `max-h-[92dvh]`.
- **Protección Anti-Cierre Accidental**:
  - Si el formulario tiene datos ingresados (`isDirty`: `total_amount` no vacío o `description` no vacía), se configura `dismissible={false}` en el Drawer móvil.
  - El usuario debe pulsar explícitamente *"Cancelar"* o confirmar el descarte para cerrar.

### 4.3 Selector de Tarjetas y Reseteo por Divisa (`CardSelectChips`)
- Lista horizontal táctil de tarjetas activas (`is_active: true`).
- Cada tarjeta muestra nombre, máscara `•••• 1234` y badge de moneda (`CLP` / `USD`).
- Si solo hay 1 tarjeta activa, se selecciona automáticamente.
- **Detección de Cambio de Divisa**:
  ```typescript
  const handleSelectCard = (selectedCard: CardRead) => {
    const currentCard = cards.find((c) => c.id === form.getValues('card_id'));
    if (currentCard && currentCard.currency !== selectedCard.currency) {
      const hasAmount = Boolean(form.getValues('total_amount'));
      if (hasAmount) {
        form.setValue('total_amount', '');
        // reset fixed amounts in splits if any
        toast.info(
          `Moneda cambiada a ${selectedCard.currency}: se restablecieron los montos para evitar discrepancias de escala`,
        );
      }
    }
    form.setValue('card_id', selectedCard.id);
  };
  ```

### 4.4 Atajos Rápidos de Fecha y Cuotas
- **Fecha**: Input de fecha con botones táctiles *"Hoy"* (`formatLocalDate(new Date())`) y *"Ayer"* (`formatLocalDate(subDays(new Date(), 1))`).
- **Cuotas**: Botones segmentados rápidos para `1` (Al contado), `3`, `6`, `12` y campo numérico para ingreso manual `1..120`.

### 4.5 Constructor de Repartos (`ExpenseSplitBuilder`)
- Pestañas accesibles para conmutar `split_type`: `EQUAL`, `PERCENTAGE`, `FIXED_AMOUNT`.
- **Estado ante 0 Participantes Activos**: Si `activePersons.length === 0`, muestra banner informativo con botón a `/persons` y deshabilita el guardado.
- **Modo EQUAL**: Muestra chips de participantes activos preseleccionados. No muestra inputs numéricos. Muestra estimación visual *"Aprox. $X por persona (ajuste de redondeo por servidor)"*.
- **Modo PERCENTAGE**:
  - Al cambiar de `EQUAL` a `PERCENTAGE`, auto-distribuye el `100.00%` entre los participantes seleccionados (ej. `50.00%` / `50.00%` para 2 personas; `33.34%` / `33.33%` / `33.33%` para 3 personas), iniciando con barra en verde al `100.00%`.
  - Componente `PercentageSplitBalance`: Barra interactiva con estado de advertencia (ámbar si < 100%), peligro (rojo si > 100%) o éxito (verde si = 100.00%).
  - Botón de utilidad accesible *"Distribuir equitativo"*.
- **Modo FIXED_AMOUNT**:
  - Muestra input monetario en la divisa de la tarjeta por persona.
  - Componente `FixedSplitBalance`: Muestra restante por asignar.
  - Botón de utilidad *"Asignar restante"* en cada fila de participante para transferir el saldo pendiente a esa persona con un solo toque.

---

## 5. Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Justificación Arquitectónica | Alternativa Descartada y Razón de Rechazo |
| :--- | :--- | :--- |
| **Contexto Global de React (`QuickExpenseContext`)** | Permite abrir el formulario desde múltiples disparadores segregados (`BottomNav`, `DesktopSidebar`, `AppHeader`, atajo de teclado) sin acoplar componentes ni forzar props drilling. | **Sincronización en URL (`?new_expense=true`)**: Descartada porque contaminaría el historial del navegador (`history.back`) y provocaría problemas de navegación en PWA standalone al cerrar el drawer con gestos táctiles. |
| **Normalización en tiempo de submit con `cleanExpensePayload`** | Garantiza que campos vacíos se envíen estrictamente como `null` y que en `EQUAL` no viajen porcentajes ni montos, cumpliendo 100% con Pydantic V2 sin complicar los tipos del estado de React Hook Form. | **Dejar strings vacíos `""`**: Descartada porque el backend rechaza con `422 Unprocessable Entity` ante la expresión regular de períodos o montos. |
| **Pre-distribución al 100% al conmutar a `PERCENTAGE`** | Ahorra fricción cognitiva al usuario; el formulario parte balanceado y el usuario solo ajusta las desviaciones deseadas. | **Iniciar todos los porcentajes en blanco `""`**: Descartada porque obligaría a calcular y tipear manualmente los números, generando frustración en móvil. |
| **Limpieza preventiva de montos al cambiar divisa de tarjeta** | Evita que una compra de $150.000 CLP se asigne por descuido a una tarjeta en dólares, generando un registro erróneo de US$150.000. | **Conservar el número sin validar divisa**: Descartada por riesgo severo de discrepancia financiera en producción. |
| **Protección `dismissible={!isDirty}` en Drawer móvil** | En pantallas táctiles, un deslizamiento inadvertido o toque en el fondo cerraría el panel perdiendo datos ingresados. | **Permitir siempre el cierre por clic exterior**: Descartada por pésima experiencia de usuario en movilidad. |

---

## 6. Estrategia de Tests y Verificación

### 6.1 Matriz de Cobertura de Requisitos Funcionales en Pruebas

| Suite de Prueba | Archivo de Prueba | RF Cubiertos | Casos Clave Verificados |
| :--- | :--- | :--- | :--- |
| **Contexto y Atajos** | `src/features/expenses/context/quick-expense-context.test.tsx`<br>`src/features/expenses/hooks/use-quick-expense-keyboard.test.ts` | RF-01 | Apertura/cierre por contexto, atajo `Alt+N`/`N`, exclusión estricta de disparo si el foco está en input/textarea. |
| **Selector de Tarjetas** | `src/features/expenses/components/card-select-chips.test.tsx` | RF-02 | Filtrado exclusivo `is_active: true`, preselección de única tarjeta activa, cambio de moneda y banner ante 0 tarjetas. |
| **Balance Porcentual** | `src/features/expenses/components/percentage-split-balance.test.tsx` | RF-07 | Barra ámbar (< 100%), roja (> 100%), verde (= 100%), botón *"Distribuir equitativo"*. |
| **Balance Monto Fijo** | `src/features/expenses/components/fixed-split-balance.test.tsx` | RF-08 | Cálculo reactivo de restante, botón *"Asignar restante"*, estado cubierto exactamente. |
| **Constructor de Splits** | `src/features/expenses/components/expense-split-builder.test.tsx` | RF-05, RF-06, RF-07, RF-08 | Conmutación de tabs, preselección en EQUAL, banner orientativo ante 0 participantes activos y bloqueo de guardado. |
| **Formulario y Normalización** | `src/features/expenses/components/quick-expense-form.test.tsx` | RF-02, RF-03, RF-04, RF-09, RF-10 | Formateo dinámico CLP/USD, atajos de fecha *"Hoy"/"Ayer"*, normalización a `null`, anti double-submit, mapeo inline 422, concurrencia 404 y resiliencia de red. |
| **Modal Adaptativo** | `src/features/expenses/components/quick-expense-drawer.test.tsx` | RF-01, RF-10 | Renderizado adaptativo Dialog/Drawer, propiedad `dismissible` condicional al estado `isDirty`. |
| **Disparadores de Navegación** | `src/components/layout/navigation-triggers.test.tsx` | RF-01 | Invocación de `open()` desde `BottomNav`, `DesktopSidebar` y `AppHeader`. |

### 6.2 Comandos de Verificación Técnica
1. Pruebas unitarias y de integración: `npm run test` (o `npx vitest run src/features/expenses src/components/layout`).
2. Chequeo estricto de tipos TypeScript: `npx tsc --noEmit`.
3. Linter: `npm run lint`.
4. Build de producción: `npm run build`.
