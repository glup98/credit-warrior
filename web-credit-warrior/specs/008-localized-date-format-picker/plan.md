# Plan Técnico 008 — Selector de Fecha Localizado en Formato DD/MM/AAAA (`008-localized-date-format-picker`)

- **Estado:** aprobado
- **Versión:** 1.0.0
- **Fecha:** 2026-10-22
- **Especificación Relacionada:** [`specs/008-localized-date-format-picker/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/008-localized-date-format-picker/spec.md) (v1.0.0, aprobado)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md) (§1, §3.1, §5.2), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

La arquitectura para la Spec 008 desacopla la lógica algorítmica de formateo, máscara y validación de calendario civil en una utilidad pura (`src/lib/date-format.ts`), mientras que actualiza el componente `QuickDatePicker` (`src/features/expenses/components/quick-date-picker.tsx`) para presentar un campo de texto enmascarado `DD/MM/AAAA` con teclado numérico en móvil (`inputMode="numeric"`), selector gráfico de calendario sincronizado vía `showPicker()` y atajos táctiles rápidos.

```text
web-credit-warrior/
├── src/
│   ├── lib/
│   │   ├── date-format.ts                   # Utilidades puras: parseIsoToDisplay, parseDisplayToIso, isValidCivilDate, formatDateMask, normalizePastedDate
│   │   ├── date-format.test.ts              # Pruebas unitarias de calendario civil, años bisiestos, máscara y conversiones
│   │   └── formatters.ts                    # formatDate, formatPeriod, formatCurrency, formatLocalDate (reutilizados)
│   ├── features/
│   │   └── expenses/
│   │       ├── components/
│   │       │   ├── quick-date-picker.tsx    # Componente visualizado en DD/MM/AAAA con showPicker() y atajos Hoy/Ayer
│   │       │   ├── quick-date-picker.test.tsx # Pruebas unitarias completas de QuickDatePicker
│   │       │   ├── quick-expense-form.tsx   # Formulario receptor (React Hook Form) integrado con QuickDatePicker
│   │       │   └── quick-expense-form.test.tsx # Pruebas de integración del formulario con la fecha en DD/MM/AAAA
│   │       └── quick-expense-integration.test.tsx # Suite de integración e2e de registro rápido
│   └── schemas/
│       └── expense.schema.ts                # expenseCreateSchema con purchase_date en ISO YYYY-MM-DD (sin cambios)
```

---

## 2. Contratos de Datos y Sincronización Bidireccional

### 2.1 Principio de Separación: Presentación Visual vs. Contrato de API

| Capa | Formato de Fecha | Ejemplo | Responsabilidad y Manejo |
| :--- | :--- | :--- | :--- |
| **Capa Visual (UI / Humana)** | `DD/MM/AAAA` | `"22/10/2026"` | Formato que el usuario ve, digita y edita en pantalla. Inmune a la configuración regional (`locale`) del navegador. |
| **Capa de Formulario (React Hook Form)** | `YYYY-MM-DD` | `"2026-10-22"` | Cadena ISO emitida por `onChange` y recibida por `value`. Valida contra `expenseCreateSchema`. |
| **Capa de Red / Backend (`api-credit-warrior`)** | `YYYY-MM-DD` | `"2026-10-22"` | Campo `purchase_date` en `ExpenseCreate` (OpenAPI 3.1.0). El contrato del backend permanece inalterado. |

### 2.2 Funciones de Conversión Deterministas

En `src/lib/date-format.ts`:

1. **`parseIsoToDisplay(isoDate: string | null | undefined): string`**:
   - Entrada: `"2026-10-22"`.
   - Si no cumple con `^\d{4}-\d{2}-\d{2}$`, retorna cadena vacía o el valor original saneado.
   - Separa año, mes y día mediante componentes numéricos:
     `const [year, month, day] = isoDate.split('-');`
   - Retorna: `"${day}/${month}/${year}"` (ej. `"22/10/2026"`).
2. **`parseDisplayToIso(displayDate: string | null | undefined): string | null`**:
   - Entrada: `"22/10/2026"`.
   - Verifica patrón exacto `^\d{2}/\d{2}/\d{4}$`.
   - Separa `[dayStr, monthStr, yearStr] = displayDate.split('/')`.
   - Valida calendario civil con `isValidCivilDate(day, month, year)`.
   - Si es válido, retorna: `"${yearStr}-${monthStr}-${dayStr}"` (ej. `"2026-10-22"`).
   - Si es inválido o incompleto, retorna `null`.

---

## 3. Algoritmo de Máscara y Validación de Calendario Civil

### 3.1 Validación Estricta de Calendario Civil (`isValidCivilDate`)
Para evitar fechas inexistentes (como el 31 de abril o 29 de febrero en años no bisiestos):

```typescript
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(month: number, year: number): number {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

export function isValidCivilDate(day: number, month: number, year: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(month, year);
  return day >= 1 && day <= maxDays;
}
```

### 3.2 Máscara Dinámica de Entrada (`formatDateMask`)
A medida que el usuario escribe dígitos, la máscara inserta automáticamente las barras `/`:
- Filtra caracteres no numéricos: `digits = input.replace(/\D/g, '').slice(0, 8)`.
- Si `digits.length <= 2`: retorna `digits`.
- Si `digits.length <= 4`: retorna `${digits.slice(0, 2)}/${digits.slice(2)}`.
- Si `digits.length > 4`: retorna `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`.
- **Manejo de borrado**: Si el usuario presiona retroceso sobre un separador `/`, se detecta que la longitud de los dígitos disminuyó y se retrocede adecuadamente sin reinstalar el separador inmediatamente.

---

## 4. Diseño de Interfaz y Selector Gráfico Integrado

### 4.1 Estrategia del Selector Gráfico con `showPicker()`
El usuario cuenta con dos vías igualmente cómodas para asignar la fecha:
1. **Entrada Manual Directa**: Campo de texto con `inputMode="numeric"`, `placeholder="DD/MM/AAAA"` y números tabulares (`tabular-nums`).
2. **Selector Gráfico de Calendario**:
   - Botón interactivo con icono `Calendar` fijado en el extremo derecho del contenedor del input (`absolute right-2 top-1/2 -translate-y-1/2`).
   - Se mantiene un `<input type="date" tabIndex={-1} aria-hidden="true" className="sr-only" />` sincronizado con el valor ISO.
   - Al pulsar el botón de calendario, se invoca `hiddenInputRef.current?.showPicker?.()`.
   - Cuando el usuario elige una fecha en el calendario del sistema/navegador, el evento `change` del input oculto actualiza el estado visible en `DD/MM/AAAA` y propaga el valor ISO a `onChange`.
   - Si el navegador no soporta `showPicker()`, se hace fallback a `focus()` y `click()` en el elemento.

### 4.2 Atajos Táctiles "Hoy" y "Ayer"
- Se mantienen en la cabecera del campo:
  - "Hoy": calcula la fecha civil local con `formatLocalDate(new Date())`.
  - "Ayer": resta 1 día a la fecha local.
- Al pulsar un atajo:
  - Asigna de inmediato el texto `DD/MM/AAAA` al campo visual.
  - Emite `YYYY-MM-DD` a `onChange`.
  - Marca `aria-pressed="true"` en el botón correspondiente si coincide con la fecha seleccionada.

---

## 5. Accesibilidad WCAG 2.1 AA y Manejo de Errores

1. **Etiquetado Semántico**:
   - `<label htmlFor={inputId}>` conectado directamente al campo visible de texto.
   - El botón de calendario posee `aria-label="Abrir calendario"` y área de interacción táctil >= `44x44px`.
2. **Estados de Error**:
   - Si la fecha ingresada es inválida o incompleta al perder el foco (`onBlur`):
     - Se asigna `aria-invalid="true"`.
     - Se vincula el mensaje de error con `aria-describedby={`${inputId}-error`}`.
     - Se despliega el mensaje de error con `role="alert"` en color carmesí (`#F43F5E`).
3. **Móviles y PWA**:
   - `inputMode="numeric"` despliega el teclado numérico en smartphones sin obligar al usuario a conmutar manualmente de letras a números.

---

## 6. Registro de Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Control Visual de Fecha** | Input de texto con máscara `DD/MM/AAAA` + `inputMode="numeric"`. | Continuar usando `<input type="date">` nativo. | La especificación HTML5 impide forzar el formato `DD/MM/AAAA` en navegadores configurados con locale anglosajón (`en-US`), provocando que se vea `MM/DD/AAAA`. |
| **Selector Gráfico** | Activación del picker nativo vía `showPicker()` en input oculto sincronizado. | Instalar librerías externas pesadas de calendario (ej. `react-day-picker` o `flatpickr`). | `showPicker()` es estándar web en navegadores modernos y en móviles despliega los selectores nativos ergonómicos sin añadir dependencias ni kilobytes al bundle. |
| **Manejo de Contrato de Datos** | Sincronización bidireccional transparente: visual `DD/MM/AAAA` <-> prop `YYYY-MM-DD`. | Cambiar el esquema Zod y el contrato de la API a `DD/MM/AAAA`. | Rompería la compatibilidad con el backend (`api-credit-warrior`), OpenAPI 3.1.0 y las bases de datos ISO. Mantener la separación preserva la integridad del dominio. |
| **Validación de Calendario** | Aritmética civil pura sin constructores `Date` UTC. | `new Date("DD/MM/AAAA")`. | El constructor `Date` de JS parsea `DD/MM/AAAA` de forma no estándar (o falla según el navegador) y genera desplazamientos al día anterior por zonas horarias occidentales. |

---

## 7. Estrategia de Pruebas y Verificación

| Nivel de Prueba | Componente / Archivo | Cobertura de RF | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **Unitaria (Lógica pura)** | `src/lib/date-format.test.ts` | RF-01, RF-02, RF-05 | Validación de bisiestos (2024 vs 2026), meses de 30/31 días, inserción de barras `/`, borrado y pegado. |
| **Unitaria (Componente)** | `src/features/expenses/components/quick-date-picker.test.tsx` | RF-01 a RF-06 | Renderizado en `DD/MM/AAAA`, tipado manual, interacción con `showPicker()`, atajos Hoy/Ayer, accesibilidad y errores. |
| **Integración de Formulario** | `src/features/expenses/components/quick-expense-form.test.tsx` | RF-01 a RF-06 | Sincronización con React Hook Form, emisión limpia de `YYYY-MM-DD` a `ExpenseCreate` y envío al servicio. |
| **Integración E2E** | `src/features/expenses/quick-expense-integration.test.tsx` | RF-01 a RF-06 | Flujo completo de captura rápida con selección de fecha por teclado y por atajos; `typecheck`, `lint` y `build` en 0 errores. |
