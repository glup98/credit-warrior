# Plan Técnico 001 — Fundación Visual, Reglas de Precisión y Núcleo de Comunicación API (`001-foundation-and-api-core`)

- **Estado:** borrador
- **Versión:** 1.0.0
- **Fecha:** 2026-10-19
- **Especificación Relacionada:** [`specs/001-foundation-and-api-core/spec.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/specs/001-foundation-and-api-core/spec.md)
- **Documentos de Referencia:** [`docs/constitution.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/constitution.md), [`docs/openapi.json`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/openapi.json), [`docs/resume.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/docs/resume.md), [`AGENTS.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/AGENTS.md), [`MEMORY.md`](file:///home/glup/src/learning/credit-warrior/web-credit-warrior/MEMORY.md)

---

## 1. Arquitectura y Estructura Exhaustiva de Archivos

El proyecto `web-credit-warrior` se estructura bajo **Next.js 15 App Router** con TypeScript estricto, separando primitivas de interfaz, esquemas de validación, capa de transporte HTTP y sincronización remota de caché.

```text
web-credit-warrior/
├── .env.example                                # Variables de entorno documentadas (NEXT_PUBLIC_API_URL)
├── .env.local                                  # Variables locales de desarrollo (http://127.0.0.1:8000)
├── next.config.ts                              # Cabeceras HTTP de seguridad (CSP, nosniff, DENY) y Serwist PWA
├── package.json                                # Dependencias y scripts de desarrollo/test
├── postcss.config.mjs                          # Configuración de PostCSS para Tailwind CSS v4
├── tsconfig.json                               # Configuración TypeScript 5 con paths y strict: true
├── vitest.config.ts                            # Configuración de Vitest con jsdom y setup de testing-library
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png                    # Icono PWA para dispositivos móviles
│   │   ├── icon-512x512.png                    # Icono PWA alta resolución y splash screen
│   │   └── icon-maskable-512x512.png           # Icono PWA con área segura adaptable
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── globals.css                         # Tokens semánticos Tailwind v4 y variables Dark Mode First
│   │   ├── layout.tsx                          # Root Layout (Dark theme root, Fonts, Providers, Toaster)
│   │   ├── manifest.ts                         # Generador nativo de Web App Manifest (PWA standalone)
│   │   ├── page.tsx                            # Verificación inicial de fundación y estado del backend
│   │   └── sw.ts                               # Service Worker con Serwist para caché de App Shell
│   ├── components/
│   │   ├── providers/
│   │   │   └── query-provider.tsx              # Provider de QueryClient con políticas de staleTime
│   │   ├── shared/
│   │   │   ├── currency-badge.tsx              # Etiqueta visual para CLP (#10B981) y USD (#38BDF8)
│   │   │   ├── empty-state.tsx                 # Primitiva de estado vacío con acción primaria directa
│   │   │   ├── money-display.tsx               # Renderizado monoespaciado tabular de montos string
│   │   │   └── person-chip.tsx                 # Píldora de participante con color_hex o fallback neutro
│   │   └── ui/
│   │       ├── badge.tsx                       # Primitiva de Badge shadcn/ui
│   │       ├── button.tsx                      # Primitiva de Button shadcn/ui
│   │       ├── card.tsx                        # Primitiva de Card contenedor
│   │       └── sonner.tsx                      # Componente Toaster adaptado a la paleta oscura
│   ├── hooks/
│   │   └── queries/
│   │       ├── use-cards.ts                    # Hooks CRUD de Tarjetas con invalidación en cascada
│   │       ├── use-dashboard.ts                # Hooks de Resumen Mensual y Proyección
│   │       ├── use-expenses.ts                 # Hooks CRUD de Compras y Schedule con invalidación
│   │       ├── use-health.ts                   # Hook de estado de salud del backend (/health)
│   │       └── use-persons.ts                  # Hooks CRUD de Personas con invalidación en cascada
│   ├── lib/
│   │   ├── formatters.ts                       # Formateadores puros: CLP, USD, fechas, períodos, máscara tarjeta
│   │   ├── query-keys.ts                       # Fábrica unificada y tipada de claves de TanStack Query
│   │   └── utils.ts                            # Helper cn() de Tailwind y mapeador de errores Pydantic
│   ├── schemas/
│   │   ├── card.schema.ts                      # cardCreateSchema y cardUpdateSchema (.strict())
│   │   ├── expense.schema.ts                   # expenseCreateSchema, expenseUpdateSchema y splits (.strict())
│   │   └── person.schema.ts                    # personCreateSchema y personUpdateSchema (.strict())
│   ├── services/
│   │   ├── api-client.ts                       # Fetch wrapper tipado, limpieza de query params y ApiError
│   │   ├── cards.service.ts                    # Integración HTTP de los 5 endpoints de /api/v1/cards
│   │   ├── dashboard.service.ts                # Integración HTTP de los 2 endpoints de /api/v1/dashboard
│   │   ├── expenses.service.ts                 # Integración HTTP de los 6 endpoints de /api/v1/expenses
│   │   ├── health.service.ts                   # Integración HTTP de GET /health
│   │   └── persons.service.ts                  # Integración HTTP de los 5 endpoints de /api/v1/persons
│   ├── test/
│   │   ├── setup.ts                            # Setup global de pruebas para Vitest y React Testing Library
│   │   └── test-utils.tsx                      # Wrapper de pruebas con QueryClientProvider
│   └── types/
│       └── api.types.ts                        # Tipos e interfaces TypeScript espejados de OpenAPI 3.1.0
```

---

## 2. Dependencias del Proyecto

El archivo `package.json` define las versiones exactas para garantizar compatibilidad con React 19 y Next.js 15:

```json
{
  "name": "web-credit-warrior",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --hostname 127.0.0.1 --port 3000",
    "build": "next build",
    "start": "next start --hostname 127.0.0.1 --port 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@serwist/next": "^9.0.11",
    "@tanstack/react-query": "^5.62.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "15.1.0",
    "next-themes": "^0.4.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.0",
    "serwist": "^9.0.11",
    "sonner": "^1.7.1",
    "tailwind-merge": "^2.5.5",
    "vaul": "^1.1.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0-alpha.33",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "eslint": "^9.16.0",
    "eslint-config-next": "15.1.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0-alpha.33",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

---

## 3. Contratos TypeScript y Esquemas Zod (`.strict()`)

### 3.1 Contratos TypeScript Espejados de `docs/openapi.json` (`src/types/api.types.ts`)

Todos los contratos representan fielmente las entidades y esquemas del backend sin relajar la tipificación de montos:

```typescript
export type CurrencyEnum = 'CLP' | 'USD';

export type SplitTypeEnum = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CardRead {
  id: string; // UUID
  name: string;
  last_four_digits: string | null;
  currency: CurrencyEnum;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CardCreate {
  name: string;
  last_four_digits?: string | null;
  currency?: CurrencyEnum;
  closing_day: number;
  due_day: number;
  is_active?: boolean;
}

export interface CardUpdate {
  name?: string | null;
  last_four_digits?: string | null;
  currency?: CurrencyEnum | null;
  closing_day?: number | null;
  due_day?: number | null;
  is_active?: boolean | null;
}

export interface PersonRead {
  id: string; // UUID
  name: string;
  color_hex: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface PersonCreate {
  name: string;
  color_hex?: string | null;
  is_active?: boolean;
}

export interface PersonUpdate {
  name?: string | null;
  color_hex?: string | null;
  is_active?: boolean | null;
}

export interface ExpenseSplitInput {
  person_id: string; // UUID
  split_type?: SplitTypeEnum;
  percentage?: string | null;
  fixed_amount?: string | null;
}

export interface ExpenseSplitRead {
  id: string; // UUID
  person_id: string; // UUID
  split_type: SplitTypeEnum;
  percentage: string | null;
  fixed_amount: string | null;
}

export interface ExpenseCreate {
  card_id: string; // UUID
  description: string;
  total_amount: string;
  purchase_date: string; // YYYY-MM-DD
  installments_count?: number;
  first_billing_override?: string | null; // YYYY-MM
  notes?: string | null;
  splits: ExpenseSplitInput[];
}

export interface ExpenseUpdate {
  card_id: string; // UUID
  description: string;
  total_amount: string;
  purchase_date: string; // YYYY-MM-DD
  installments_count?: number;
  first_billing_override?: string | null; // YYYY-MM
  notes?: string | null;
  splits: ExpenseSplitInput[];
}

export interface ExpenseRead {
  id: string; // UUID
  card_id: string; // UUID
  description: string;
  total_amount: string;
  purchase_date: string; // YYYY-MM-DD
  installments_count: number;
  first_billing_override: string | null;
  notes: string | null;
  splits: ExpenseSplitRead[];
  created_at: string;
  updated_at: string;
}

export interface PersonShareScheduleItem {
  person_id: string;
  person_name: string;
  amount: string;
}

export interface InstallmentScheduleItem {
  installment_number: number;
  installments_count: number;
  installment_label: string; // ej. "1/3"
  statement_period: string; // YYYY-MM
  payment_period: string; // YYYY-MM
  closing_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  installment_amount: string;
  person_shares: PersonShareScheduleItem[];
}

export interface ExpenseScheduleResponse {
  expense_id: string;
  description: string;
  card_id: string;
  card_name: string;
  currency: string;
  total_amount: string;
  installments_count: number;
  schedule: InstallmentScheduleItem[];
}

export interface CardPersonBreakdown {
  person_id: string;
  person_name: string;
  amount_due: string;
}

export interface CardMonthlySummary {
  card_id: string;
  card_name: string;
  currency: CurrencyEnum;
  closing_date: string;
  due_date: string;
  total_due: string;
  by_person: CardPersonBreakdown[];
}

export interface PersonMonthlySummary {
  person_id: string;
  person_name: string;
  totals_by_currency: Record<CurrencyEnum, string>;
}

export interface ActiveInstallmentItem {
  expense_id: string;
  description: string;
  card_id: string;
  card_name: string;
  currency: CurrencyEnum;
  installment_number: number;
  installments_count: number;
  installment_label: string;
  installment_amount: string;
  person_shares: PersonShareScheduleItem[];
}

export interface DashboardSummaryResponse {
  period: string; // YYYY-MM
  totals_by_currency: Record<CurrencyEnum, string>;
  by_card: CardMonthlySummary[];
  by_person: PersonMonthlySummary[];
  active_installments: ActiveInstallmentItem[];
}

export interface DashboardProjectionResponse {
  start_period: string;
  months: number;
  periods: DashboardSummaryResponse[];
}

export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail: ValidationErrorItem[];
}
```

### 3.2 Esquemas Zod Estrictos (`.strict()`)

#### Tarjetas (`src/schemas/card.schema.ts`)
Para satisfacer las observaciones de `@reviewer`, `cardUpdateSchema` permite parcialidad total (`optional()` y `nullable()` en cada campo), fundamental para archivar tarjetas ejecutando `PATCH { "is_active": false }`.

```typescript
import { z } from 'zod';

export const currencyEnumSchema = z.enum(['CLP', 'USD']);

export const cardCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre de la tarjeta es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    last_four_digits: z
      .string()
      .regex(/^\d{4}$/, 'Debe contener exactamente 4 dígitos')
      .nullable()
      .optional(),
    currency: currencyEnumSchema.default('CLP'),
    closing_day: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Día entre 1 y 31')
      .max(31, 'Día entre 1 y 31'),
    due_day: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Día entre 1 y 31')
      .max(31, 'Día entre 1 y 31'),
    is_active: z.boolean().default(true),
  })
  .strict();

export const cardUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(100, 'Máximo 100 caracteres')
      .nullable()
      .optional(),
    last_four_digits: z
      .string()
      .regex(/^\d{4}$/, 'Debe contener exactamente 4 dígitos')
      .nullable()
      .optional(),
    currency: currencyEnumSchema.nullable().optional(),
    closing_day: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Día entre 1 y 31')
      .max(31, 'Día entre 1 y 31')
      .nullable()
      .optional(),
    due_day: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Día entre 1 y 31')
      .max(31, 'Día entre 1 y 31')
      .nullable()
      .optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();
```

#### Personas (`src/schemas/person.schema.ts`)
De forma análoga, `personUpdateSchema` permite parcialidad total para el archivado mediante `PATCH { "is_active": false }`.

```typescript
import { z } from 'zod';

export const personCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre del participante es obligatorio')
      .max(100, 'Máximo 100 caracteres'),
    color_hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato hexadecimal requerido (ej. #FF5733)')
      .nullable()
      .optional(),
    is_active: z.boolean().default(true),
  })
  .strict();

export const personUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre no puede estar vacío')
      .max(100, 'Máximo 100 caracteres')
      .nullable()
      .optional(),
    color_hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato hexadecimal requerido (ej. #FF5733)')
      .nullable()
      .optional(),
    is_active: z.boolean().nullable().optional(),
  })
  .strict();
```

#### Compras y Splits (`src/schemas/expense.schema.ts`)
Se incorporan las validaciones estrictas para `ExpenseSplitInput`: `percentage` y `fixed_amount` exigen strings numéricos positivos mayores a cero (`exclusiveMinimum: 0.0`) y `percentage <= 100.0`.

```typescript
import { z } from 'zod';
import { toCents } from '@/lib/formatters';

export const decimalStringRegex = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export const splitTypeSchema = z.enum(['EQUAL', 'PERCENTAGE', 'FIXED_AMOUNT']);

export const expenseSplitInputSchema = z
  .object({
    person_id: z.string().uuid('Identificador de persona inválido'),
    split_type: splitTypeSchema.default('EQUAL'),
    percentage: z
      .string()
      .regex(decimalStringRegex, 'Porcentaje numérico inválido')
      .refine((v) => Number(v) > 0, 'El porcentaje debe ser estrictamente mayor a 0')
      .refine((v) => Number(v) <= 100, 'El porcentaje no puede superar 100.00%')
      .nullable()
      .optional(),
    fixed_amount: z
      .string()
      .regex(decimalStringRegex, 'Monto fijo numérico inválido')
      .refine((v) => Number(v) > 0, 'El monto fijo debe ser estrictamente mayor a 0')
      .nullable()
      .optional(),
  })
  .strict();

export const expenseCreateSchema = z
  .object({
    card_id: z.string().uuid('Debes seleccionar una tarjeta'),
    description: z
      .string()
      .trim()
      .min(1, 'La descripción es obligatoria')
      .max(255, 'Máximo 255 caracteres'),
    total_amount: z
      .string()
      .regex(decimalStringRegex, 'Monto inválido (ej. 100000 o 33.34)')
      .refine((v) => Number(v) > 0, 'El monto total debe ser estrictamente mayor a 0'),
    purchase_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha requerido: YYYY-MM-DD'),
    installments_count: z.coerce
      .number()
      .int('El número de cuotas debe ser entero')
      .min(1, 'Mínimo 1 cuota')
      .max(120, 'Máximo 120 cuotas')
      .default(1),
    first_billing_override: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de período requerido: YYYY-MM')
      .nullable()
      .optional(),
    notes: z.string().max(2000, 'Máximo 2000 caracteres').nullable().optional(),
    splits: z
      .array(expenseSplitInputSchema)
      .min(1, 'Debes asignar al menos un participante al gasto'),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Unicidad de person_id
    const seenPersons = new Set<string>();
    for (const [idx, split] of data.splits.entries()) {
      if (seenPersons.has(split.person_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['splits', idx, 'person_id'],
          message: 'Un participante no puede repetirse en la misma compra',
        });
      }
      seenPersons.add(split.person_id);
    }

    // 2. Uniformidad de split_type
    const uniformType = data.splits[0]?.split_type;
    const hasMixedTypes = data.splits.some((s) => s.split_type !== uniformType);
    if (hasMixedTypes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['splits'],
        message: 'Todas las asignaciones deben utilizar el mismo método de reparto',
      });
      return;
    }

    // 3. Validación de sumas en enteros (centavos / centésimas)
    if (uniformType === 'PERCENTAGE') {
      const sumPercentageCents = data.splits.reduce((acc, s) => acc + toCents(s.percentage), 0);
      if (sumPercentageCents !== 10000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['splits'],
          message: 'La suma de porcentajes debe ser exactamente 100.00%',
        });
      }
    }

    if (uniformType === 'FIXED_AMOUNT') {
      const sumFixedCents = data.splits.reduce((acc, s) => acc + toCents(s.fixed_amount), 0);
      const totalAmountCents = toCents(data.total_amount);
      if (sumFixedCents !== totalAmountCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['splits'],
          message: 'La suma de los montos fijos debe coincidir exactamente con el monto total',
        });
      }
    }
  });

export const expenseUpdateSchema = expenseCreateSchema;
```

---

## 4. Capa HTTP y Caché Remoto

### 4.1 Cliente HTTP y Manejo Tipado de Errores (`src/services/api-client.ts`)

```typescript
import { ValidationErrorItem } from '@/types/api.types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string | ValidationErrorItem[],
  ) {
    super(typeof detail === 'string' ? detail : 'Error de validación en los datos enviados');
    this.name = 'ApiError';
  }

  get isDomainError(): boolean {
    return typeof this.detail === 'string';
  }

  get isValidationError(): boolean {
    return Array.isArray(this.detail);
  }

  get validationErrors(): ValidationErrorItem[] {
    return Array.isArray(this.detail) ? this.detail : [];
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  queryParams?: Record<string, unknown>,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}${buildQueryString(queryParams)}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiError(0, 'No fue posible conectar con el servidor de Credit Warrior');
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorBody: { detail?: string | ValidationErrorItem[] } = {};
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { detail: response.statusText || 'Error inesperado del servidor' };
    }
    throw new ApiError(response.status, errorBody.detail || 'Error en la petición');
  }

  return response.json();
}
```

### 4.2 Helper de Mapeo de Errores Pydantic (`src/lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApiError } from '@/services/api-client';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mapPydanticErrorsToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.isValidationError) {
    return false;
  }

  for (const item of error.validationErrors) {
    // loc viene típicamente como ["body", "splits", 0, "percentage"] o ["body", "name"]
    const cleanPath = item.loc
      .filter((segment) => segment !== 'body')
      .join('.') as Path<T>;

    if (cleanPath) {
      setError(cleanPath, {
        type: item.type || 'server',
        message: item.msg,
      });
    }
  }

  return true;
}
```

### 4.3 Fábrica Centralizada de Query Keys (`src/lib/query-keys.ts`)

```typescript
import { CurrencyEnum } from '@/types/api.types';

export const queryKeys = {
  health: ['health'] as const,
  cards: {
    all: ['cards'] as const,
    list: (filters?: { is_active?: boolean; currency?: CurrencyEnum }) =>
      [...queryKeys.cards.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.cards.all, 'detail', id] as const,
  },
  persons: {
    all: ['persons'] as const,
    list: (filters?: { is_active?: boolean }) =>
      [...queryKeys.persons.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.persons.all, 'detail', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: {
      card_id?: string;
      person_id?: string;
      date_from?: string;
      date_to?: string;
      active_in_period?: string;
    }) => [...queryKeys.expenses.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
    schedule: (id: string) => [...queryKeys.expenses.all, 'schedule', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (period?: string) =>
      [...queryKeys.dashboard.all, 'summary', period ?? 'next'] as const,
    projection: (params?: { start_period?: string; months?: number }) =>
      [...queryKeys.dashboard.all, 'projection', params ?? { months: 6 }] as const,
  },
};
```

### 4.4 Servicios de Dominio (`src/services/*.service.ts`)

- **`health.service.ts`**: `checkHealth(): Promise<Record<string, string>>` vía `GET /health`.
- **`cards.service.ts`**:
  - `list(filters)`: `GET /api/v1/cards`
  - `getById(id)`: `GET /api/v1/cards/{id}`
  - `create(data)`: `POST /api/v1/cards`
  - `update(id, data)`: `PATCH /api/v1/cards/{id}`
  - `remove(id)`: `DELETE /api/v1/cards/{id}`
- **`persons.service.ts`**:
  - `list(filters)`: `GET /api/v1/persons`
  - `getById(id)`: `GET /api/v1/persons/{id}`
  - `create(data)`: `POST /api/v1/persons`
  - `update(id, data)`: `PATCH /api/v1/persons/{id}`
  - `remove(id)`: `DELETE /api/v1/persons/{id}`
- **`expenses.service.ts`**:
  - `list(filters)`: `GET /api/v1/expenses`
  - `getById(id)`: `GET /api/v1/expenses/{id}`
  - `create(data)`: `POST /api/v1/expenses`
  - `update(id, data)`: `PUT /api/v1/expenses/{id}`
  - `remove(id)`: `DELETE /api/v1/expenses/{id}`
  - `getSchedule(id)`: `GET /api/v1/expenses/{id}/schedule`
- **`dashboard.service.ts`**:
  - `getSummary(period?)`: `GET /api/v1/dashboard/summary`
  - `getProjection(params?)`: `GET /api/v1/dashboard/projection`

### 4.5 Políticas de Frescura e Invalidación en Cascada (`src/hooks/queries/*.ts`)

- **Catálogos maestros (`cards`, `persons`)**: `staleTime: 5 * 60 * 1000` (5 minutos).
- **Datos financieros (`expenses`, `dashboard`)**: `staleTime: 30 * 1000` (30 segundos), `refetchOnWindowFocus: true`.
- **Invalidación en cascada**:
  - `useCreateCard`, `useUpdateCard`, `useDeleteCard` -> `queryClient.invalidateQueries({ queryKey: queryKeys.cards.all })` y `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`.
  - `useCreatePerson`, `useUpdatePerson`, `useDeletePerson` -> `queryClient.invalidateQueries({ queryKey: queryKeys.persons.all })` y `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`.
  - `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense` -> `queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })` y `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })`.

---

## 5. Formateadores Visuales e Inmutabilidad (`src/lib/formatters.ts`)

Todos los formateadores operan como funciones puras sobre cadenas de texto, garantizando inmunidad ante desvíos horarios UTC:

```typescript
import { CurrencyEnum } from '@/types/api.types';

export function toCents(val?: string | null): number {
  if (!val || typeof val !== 'string') return 0;
  const trimmed = val.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(trimmed)) return 0;
  const [intPart = '0', decPart = ''] = trimmed.split('.');
  return Number(intPart) * 100 + Number(decPart.padEnd(2, '0').slice(0, 2));
}

export function formatCurrency(amount: string | null | undefined, currency: CurrencyEnum): string {
  const safeAmount = (amount ?? '0').trim();
  const [intPart = '0', decPart = '00'] = safeAmount.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (currency === 'CLP') {
    return `$${formattedInt}`;
  }

  // USD: 2 decimales fijos
  const safeDec = decPart.padEnd(2, '0').slice(0, 2);
  return `US$${formattedInt}.${safeDec}`;
}

export function formatPercentage(percentage: string | null | undefined): string {
  const safe = (percentage ?? '0').trim();
  const [intPart = '0', decPart = '00'] = safe.split('.');
  const safeDec = decPart.padEnd(2, '0').slice(0, 2);
  return `${intPart}.${safeDec}%`;
}

const MONTH_NAMES_ES: Record<string, { full: string; compact: string }> = {
  '01': { full: 'Enero', compact: 'Ene' },
  '02': { full: 'Febrero', compact: 'Feb' },
  '03': { full: 'Marzo', compact: 'Mar' },
  '04': { full: 'Abril', compact: 'Abr' },
  '05': { full: 'Mayo', compact: 'May' },
  '06': { full: 'Junio', compact: 'Jun' },
  '07': { full: 'Julio', compact: 'Jul' },
  '08': { full: 'Agosto', compact: 'Ago' },
  '09': { full: 'Septiembre', compact: 'Sep' },
  '10': { full: 'Octubre', compact: 'Oct' },
  '11': { full: 'Noviembre', compact: 'Nov' },
  '12': { full: 'Diciembre', compact: 'Dic' },
};

export function formatPeriod(period: string, format: 'full' | 'compact' = 'full'): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return period;
  const [year, month] = period.split('-');
  const monthData = MONTH_NAMES_ES[month];
  if (!monthData) return period;
  const name = format === 'full' ? monthData.full : monthData.compact;
  return `${name} ${year}`;
}

export function formatDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-');
  const monthData = MONTH_NAMES_ES[month];
  if (!monthData) return dateStr;
  return `${Number(day)} ${monthData.compact.toLowerCase()} ${year}`;
}

export function formatMaskedCard(lastFourDigits: string | null | undefined): string {
  if (!lastFourDigits || !/^\d{4}$/.test(lastFourDigits)) return '';
  return `•••• ${lastFourDigits}`;
}
```

---

## 6. Primitivas Visuales Compartidas del Dominio

1. **`MoneyDisplay` (`src/components/shared/money-display.tsx`)**:
   Renderiza el monto con `formatCurrency`, clase tipográfica `font-mono tabular-nums`, alineación a la derecha en contextos tabulares y colores semánticos (`#10B981` para CLP, `#38BDF8` para USD o blanco titular).
2. **`CurrencyBadge` (`src/components/shared/currency-badge.tsx`)**:
   Insignia compacta con fondo translúcido y borde sutil:
   - `CLP`: `bg-emerald-950/40 text-emerald-400 border border-emerald-800/50`
   - `USD`: `bg-sky-950/40 text-sky-400 border border-sky-800/50`
3. **`PersonChip` (`src/components/shared/person-chip.tsx`)**:
   Muestra un círculo indicador con `color_hex` o `#8A93A6` como fallback neutro, nombre del participante con `truncate` y `max-w-[140px]`.
4. **`EmptyState` (`src/components/shared/empty-state.tsx`)**:
   Contenedor con superficie `#12141C`, borde `#232736`, icono semántico, titular claro, explicación concisa y botón de acción con verbo activo.
5. **`Toaster` (`src/components/ui/sonner.tsx`)**:
   Wrapper de `sonner` con tema oscuro fijo, fondos en `#12141C`, texto `#F3F5F8` y borde `#232736`.

---

## 7. PWA, Seguridad y Sistema de Tokens

### 7.1 Web App Manifest (`src/app/manifest.ts`)

```typescript
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Credit Warrior',
    short_name: 'CreditWarrior',
    description: 'Gestión de tarjetas de crédito compartidas y cuotas multimoneda',
    start_url: '/',
    display: 'standalone',
    background_color: '#090A0F',
    theme_color: '#090A0F',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
```

### 7.2 Cabeceras de Seguridad y Configuración Next (`next.config.ts`)

```typescript
import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
```

### 7.3 Tokens Semánticos Tailwind CSS v4 (`src/app/globals.css`)

```css
@import 'tailwindcss';

@theme {
  --color-canvas: #090a0f;
  --color-surface: #12141c;
  --color-elevated: #1a1d28;
  --color-border-subtle: #232736;
  --color-text-primary: #f3f5f8;
  --color-text-muted: #8a93a6;
  --color-accent-clp: #10b981;
  --color-accent-usd: #38bdf8;
  --color-accent-warning: #f59e0b;
  --color-accent-danger: #f43f5e;

  --font-sans: var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: var(--font-jetbrains-mono), monospace;
}

:root {
  color-scheme: dark;
}

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  min-height: 100vh;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}
```

---

## 8. Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Elegida | Alternativa Descartada | Justificación Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Manejo de Montos y Precisión** | `string` inmutable + `toCents()` solo para sumas de validación. | Tipos `number` / `BigInt` / librerías `bignumber.js`. | JavaScript produce errores de coma flotante (`0.1 + 0.2 === 0.30000000000000004`). Mantener `string` garantiza exactitud absoluta de punta a punta idéntica al backend. |
| **Caché y Estado del Servidor** | **TanStack Query v5** con factory centralizada `queryKeys`. | Store global en **Zustand** o **Redux Toolkit**. | Evita duplicar el estado del servidor en memoria local. TanStack Query resuelve automáticamente desduplicación, reintentos e invalidación en cascada. |
| **Validación de Formularios** | **Zod `.strict()`** con `@hookform/resolvers`. | Validación manual o `Yup` / `Joi`. | Pydantic V2 en backend exige `extra="forbid"`. Zod `.strict()` bloquea llaves extra en el cliente antes de la llamada HTTP, y se integra nativamente con React Hook Form. |
| **Normalización de Errores Pydantic** | Helper `mapPydanticErrorsToForm` mapeando `loc` a campos. | Toasts genéricos con JSON crudo. | Ofrece feedback directo en el campo afectado (resaltado en rojo con mensaje de error) en lugar de una notificación flotante desconectada del formulario. |
| **Soporte PWA en Next 15** | **`@serwist/next`** + `src/app/manifest.ts` nativo. | `next-pwa` heredado o plugins manuales. | `@serwist/next` es el estándar moderno y mantenido compatible con Webpack/Turbopack en Next.js 15 App Router. |
| **Framework de Testing** | **Vitest** + **React Testing Library** + **JSDOM**. | Jest + Babel. | Vitest es nativo para entornos ESM/TypeScript modernos, comparte configuración con Vite/Next y ejecuta las pruebas de forma instantánea. |

---

## 9. Estrategia de Tests y TDD

La metodología TDD exige escribir los tests en rojo antes de la implementación de cada módulo:

1. **Formatters (`src/lib/formatters.test.ts`)**:
   - Cubre **RF-02**, **RF-04**, **RF-05**.
   - Tests para `formatCurrency`: CLP sin decimales (`"100000"` -> `$100.000`, `"0"` -> `$0`), USD con 2 decimales (`"33.34"` -> `US$33.34`, `"0.00"` -> `US$0.00`).
   - Tests para `formatPercentage`: `"70"` -> `70.00%`, `"33.33"` -> `33.33%`.
   - Tests para `formatPeriod` y `formatDate`: Fechas en husos horarios occidentales sin corrimiento UTC.
   - Tests para `formatMaskedCard`: `"1234"` -> `•••• 1234`, `null`/`""` -> `""`.
   - Tests para `toCents`: Conversión entera de `"33.33"`, `"33.33"`, `"33.34"` -> suma `10000`.
2. **Esquemas Zod (`src/schemas/*.test.ts`)**:
   - Cubre **RF-04**, **RF-08**.
   - Rechazo de llaves extras (`.strict()`).
   - Parcialidad en `cardUpdateSchema` y `personUpdateSchema` (`{ is_active: false }`).
   - `ExpenseSplitInput`: strings positivos > 0, porcentajes <= 100, suma 100.00%, suma fija igual a `total_amount`.
3. **Cliente HTTP y Servicios (`src/services/api-client.test.ts`)**:
   - Cubre **RF-06**, **RF-07**.
   - Omisión de query params vacíos (`undefined`, `null`, `""`).
   - Parseo de `204 No Content` sin error JSON.
   - Captura de `ApiError` en 400, 404, 409 y 422 (`loc` y `msg`).
   - Mapeo de errores de red.
4. **Hooks y Query Keys (`src/hooks/queries/use-queries.test.tsx`)**:
   - Cubre **RF-06**, **RF-09**.
   - Invalidación en cascada hacia `queryKeys.dashboard.all` tras mutación en tarjetas, personas y gastos.
   - Verificación de `staleTime` de 5m (maestros) y 30s (financieros).
5. **Componentes Compartidos (`src/components/shared/*.test.tsx`)**:
   - Cubre **RF-01**, **RF-02**, **RF-05**, **RF-10**.
   - `MoneyDisplay` con variante mono tabular-nums.
   - `CurrencyBadge` con clases semánticas CLP y USD.
   - `PersonChip` con `color_hex` custom y fallback neutro.
   - `EmptyState` renderizando título y respondiendo al clic en el botón de acción.
