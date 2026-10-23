/**
 * OpenAPI 3.1.0 TypeScript Contract Definitions
 * Mirroring FastAPI backend schemas for Credit Warrior.
 *
 * Inviolable Rules:
 * 1. Zero financial logic on client: rendered values are authoritative from the API.
 * 2. Strict strings for all monetary, percentage, and currency accumulator fields.
 * 3. Exact field name mirroring (snake_case).
 */

// ============================================================================
// Enums & Domain Constants
// ============================================================================

/**
 * Supported card billing currencies.
 * Corresponds to CurrencyEnum in OpenAPI 3.1.0 schema.
 */
export type CurrencyEnum = 'CLP' | 'USD';
export type Currency = CurrencyEnum;

/**
 * Supported expense division strategies across persons.
 * Corresponds to SplitTypeEnum in OpenAPI 3.1.0 schema.
 */
export type SplitTypeEnum = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';
export type SplitType = SplitTypeEnum;

// ============================================================================
// Cards
// ============================================================================

/**
 * Origin of the effective monthly maintenance fee.
 */
export type FeeSourceEnum = 'OVERRIDE' | 'CARD_DEFAULT';

/**
 * Schema for creating a credit card.
 */
export interface CardCreate {
  name: string;
  last_four_digits?: string | null;
  currency?: CurrencyEnum;
  closing_day: number;
  due_day: number;
  default_monthly_fee?: string;
  is_active?: boolean;
}

/**
 * Schema for updating a credit card (supports partial patch and nullification).
 */
export interface CardUpdate {
  name?: string | null;
  last_four_digits?: string | null;
  currency?: CurrencyEnum | null;
  closing_day?: number | null;
  due_day?: number | null;
  default_monthly_fee?: string | null;
  is_active?: boolean | null;
}

/**
 * Schema for reading card data from the backend.
 */
export interface CardRead {
  id: string; // UUID
  name: string;
  last_four_digits: string | null;
  currency: CurrencyEnum;
  closing_day: number;
  due_day: number;
  default_monthly_fee?: string;
  is_active: boolean;
  created_at: string; // ISO 8601 date-time
  updated_at: string; // ISO 8601 date-time
}

/**
 * Schema for reading an effective monthly maintenance fee override.
 */
export interface CardMonthlyFeeResponse {
  card_id: string; // UUID
  period: string; // YYYY-MM
  fee: string; // Decimal string
  source: FeeSourceEnum;
}

/**
 * Schema for setting or updating a monthly maintenance fee override.
 */
export interface CardMonthlyFeeCreateOrUpdate {
  fee: string; // Decimal string
}

// ============================================================================
// Persons
// ============================================================================

/**
 * Schema for creating a person.
 */
export interface PersonCreate {
  name: string;
  color_hex?: string | null;
  is_active?: boolean;
}

/**
 * Schema for updating a person (supports partial patch and nullification).
 */
export interface PersonUpdate {
  name?: string | null;
  color_hex?: string | null;
  is_active?: boolean | null;
}

/**
 * Schema for reading person data from the backend.
 */
export interface PersonRead {
  id: string; // UUID
  name: string;
  color_hex: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601 date-time
  updated_at: string; // ISO 8601 date-time
}

// ============================================================================
// Expenses & Splits
// ============================================================================

/**
 * Input schema for person split within an expense creation or update.
 * All monetary amounts and percentages are strictly formatted as strings on the client.
 */
export interface ExpenseSplitInput {
  person_id: string; // UUID
  split_type?: SplitTypeEnum;
  percentage?: string | null;
  fixed_amount?: string | null;
}

/**
 * Schema for reading persisted person splits from the backend.
 */
export interface ExpenseSplitRead {
  id: string; // UUID
  person_id: string; // UUID
  split_type: SplitTypeEnum;
  percentage: string | null;
  fixed_amount: string | null;
}

/**
 * Schema for creating an expense with its splits.
 */
export interface ExpenseCreate {
  card_id: string; // UUID
  description: string;
  total_amount: string; // Decimal string (strictly string)
  purchase_date: string; // YYYY-MM-DD
  installments_count?: number;
  first_billing_override?: string | null; // YYYY-MM
  notes?: string | null;
  splits: ExpenseSplitInput[];
}

/**
 * Full replacement schema for updating an expense and its splits.
 */
export interface ExpenseUpdate {
  card_id: string; // UUID
  description: string;
  total_amount: string; // Decimal string (strictly string)
  purchase_date: string; // YYYY-MM-DD
  installments_count?: number;
  first_billing_override?: string | null; // YYYY-MM
  notes?: string | null;
  splits: ExpenseSplitInput[];
}

/**
 * Schema for reading persisted expense data from the backend.
 */
export interface ExpenseRead {
  id: string; // UUID
  card_id: string; // UUID
  description: string;
  total_amount: string; // Decimal string
  purchase_date: string; // YYYY-MM-DD
  installments_count: number;
  first_billing_override: string | null; // YYYY-MM
  notes: string | null;
  splits: ExpenseSplitRead[];
  created_at: string; // ISO 8601 date-time
  updated_at: string; // ISO 8601 date-time
}

/**
 * Breakdown per person within an installment schedule item.
 */
export interface PersonShareScheduleItem {
  person_id: string; // UUID
  person_name: string;
  amount: string; // Decimal string
}

/**
 * Single installment line in an expense billing schedule.
 */
export interface InstallmentScheduleItem {
  installment_number: number;
  installments_count: number;
  installment_label: string; // e.g. "1/3"
  statement_period: string; // YYYY-MM
  payment_period: string; // YYYY-MM
  closing_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  installment_amount: string; // Decimal string
  person_shares: PersonShareScheduleItem[];
}

/**
 * Full installment projection schedule response for a single expense.
 */
export interface ExpenseScheduleResponse {
  expense_id: string; // UUID
  description: string;
  card_id: string; // UUID
  card_name: string;
  currency: string;
  total_amount: string; // Decimal string
  installments_count: number;
  schedule: InstallmentScheduleItem[];
}

// ============================================================================
// Dashboard
// ============================================================================

/**
 * Breakdown of amount due for a person within a card's monthly summary.
 */
export interface CardPersonBreakdown {
  person_id: string; // UUID
  person_name: string;
  purchases_amount?: string; // Decimal string (default "0" in backend)
  fee_share?: string; // Decimal string (default "0" in backend)
  amount_due: string; // Decimal string
}

/**
 * Monthly billing summary for a specific credit card.
 */
export interface CardMonthlySummary {
  card_id: string; // UUID
  card_name: string;
  currency: CurrencyEnum;
  closing_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  purchases_total?: string; // Decimal string (default "0" in backend)
  maintenance_fee?: string; // Decimal string (default "0" in backend)
  total_due: string; // Decimal string
  by_person: CardPersonBreakdown[];
}

/**
 * Monthly billing summary for a specific person across all cards and currencies.
 */
export interface PersonMonthlySummary {
  person_id: string; // UUID
  person_name: string;
  totals_by_currency: Record<string, string>;
}

/**
 * Share of an active installment assigned to a person.
 */
export interface ActiveInstallmentShare {
  person_id: string; // UUID
  person_name: string;
  amount: string; // Decimal string
}

/**
 * An active installment impacting the current dashboard period.
 */
export interface ActiveInstallmentItem {
  expense_id: string; // UUID
  description: string;
  card_id: string; // UUID
  card_name: string;
  currency: CurrencyEnum;
  purchase_date: string; // YYYY-MM-DD
  installment_number: number;
  installments_count: number;
  installment_label: string; // e.g. "2/6"
  installment_amount: string; // Decimal string
  person_shares: ActiveInstallmentShare[];
}

/**
 * Aggregate summary response for a monthly billing period.
 */
export interface DashboardSummaryResponse {
  period: string; // YYYY-MM
  totals_by_currency: Record<string, string>;
  by_card: CardMonthlySummary[];
  by_person: PersonMonthlySummary[];
  active_installments: ActiveInstallmentItem[];
}

/**
 * Multi-period projection response.
 */
export interface DashboardProjectionResponse {
  start_period: string; // YYYY-MM
  months: number;
  periods: DashboardSummaryResponse[];
}

// ============================================================================
// Error Handling & System Contracts
// ============================================================================

/**
 * Individual Pydantic V2 / FastAPI validation error item.
 */
export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/**
 * Alias matching the OpenAPI title `ValidationError`.
 */
export type ValidationError = ValidationErrorItem;

/**
 * FastAPI 422 HTTP validation error envelope.
 */
export interface HTTPValidationError {
  detail?: ValidationErrorItem[];
}

/**
 * Normalized API error detail payload (can be a raw message or structured validation errors).
 */
export type ApiErrorDetail = string | ValidationErrorItem[];

/**
 * Health check endpoint response.
 */
export interface HealthResponse {
  status: string;
  [key: string]: string;
}

// ============================================================================
// Filters & Query Parameters
// ============================================================================

/**
 * Query parameters for filtering cards.
 */
export interface CardFilters {
  is_active?: boolean;
  currency?: CurrencyEnum;
}

/**
 * Query parameters for filtering persons.
 */
export interface PersonFilters {
  is_active?: boolean;
}

/**
 * Query parameters for filtering expenses.
 */
export interface ExpenseFilters {
  card_id?: string;
  person_id?: string;
  date_from?: string;
  date_to?: string;
  active_in_period?: string;
}

/**
 * Query parameters for dashboard summary.
 */
export interface DashboardSummaryParams {
  period?: string;
}

/**
 * Query parameters for dashboard projections.
 */
export interface DashboardProjectionParams {
  start_period?: string;
  months?: number;
}
