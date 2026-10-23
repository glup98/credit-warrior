import { describe, it, expectTypeOf } from 'vitest';
import type {
  CurrencyEnum,
  Currency,
  SplitTypeEnum,
  SplitType,
  CardRead,
  CardCreate,
  CardUpdate,
  FeeSourceEnum,
  CardMonthlyFeeResponse,
  CardMonthlyFeeCreateOrUpdate,
  PersonRead,
  PersonCreate,
  PersonUpdate,
  ExpenseSplitInput,
  ExpenseSplitRead,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseRead,
  PersonShareScheduleItem,
  InstallmentScheduleItem,
  ExpenseScheduleResponse,
  CardPersonBreakdown,
  CardMonthlySummary,
  PersonMonthlySummary,
  ActiveInstallmentShare,
  ActiveInstallmentItem,
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  ValidationErrorItem,
  ValidationError,
  HTTPValidationError,
  ApiErrorDetail,
  CardFilters,
  PersonFilters,
  ExpenseFilters,
  DashboardSummaryParams,
  DashboardProjectionParams,
} from './api.types';

describe('API Types Contract Verification', () => {
  it('should mirror Currency and SplitType enums correctly', () => {
    expectTypeOf<Currency>().toEqualTypeOf<CurrencyEnum>();
    expectTypeOf<CurrencyEnum>().toEqualTypeOf<'CLP' | 'USD'>();
    expectTypeOf<SplitType>().toEqualTypeOf<SplitTypeEnum>();
    expectTypeOf<SplitTypeEnum>().toEqualTypeOf<'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT'>();
  });

  it('should enforce strict typing for Card models', () => {
    expectTypeOf<FeeSourceEnum>().toEqualTypeOf<'OVERRIDE' | 'CARD_DEFAULT'>();

    expectTypeOf<CardCreate>().toMatchTypeOf<{
      name: string;
      last_four_digits?: string | null;
      currency?: CurrencyEnum;
      closing_day: number;
      due_day: number;
      default_monthly_fee?: string;
      is_active?: boolean;
    }>();

    expectTypeOf<CardUpdate>().toMatchTypeOf<{
      name?: string | null;
      last_four_digits?: string | null;
      currency?: CurrencyEnum | null;
      closing_day?: number | null;
      due_day?: number | null;
      default_monthly_fee?: string | null;
      is_active?: boolean | null;
    }>();

    expectTypeOf<CardRead>().toMatchTypeOf<{
      id: string;
      name: string;
      last_four_digits: string | null;
      currency: CurrencyEnum;
      closing_day: number;
      due_day: number;
      default_monthly_fee?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>();

    expectTypeOf<CardMonthlyFeeResponse>().toMatchTypeOf<{
      card_id: string;
      period: string;
      fee: string;
      source: FeeSourceEnum;
    }>();

    expectTypeOf<CardMonthlyFeeCreateOrUpdate>().toMatchTypeOf<{
      fee: string;
    }>();
  });

  it('should enforce strict typing for Person models', () => {
    expectTypeOf<PersonCreate>().toMatchTypeOf<{
      name: string;
      color_hex?: string | null;
      is_active?: boolean;
    }>();

    expectTypeOf<PersonUpdate>().toMatchTypeOf<{
      name?: string | null;
      color_hex?: string | null;
      is_active?: boolean | null;
    }>();

    expectTypeOf<PersonRead>().toMatchTypeOf<{
      id: string;
      name: string;
      color_hex: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>();
  });

  it('should enforce strict string typing for monetary values in Expenses and Splits', () => {
    expectTypeOf<ExpenseSplitInput>().toMatchTypeOf<{
      person_id: string;
      split_type?: SplitTypeEnum;
      percentage?: string | null;
      fixed_amount?: string | null;
    }>();

    expectTypeOf<ExpenseSplitRead>().toMatchTypeOf<{
      id: string;
      person_id: string;
      split_type: SplitTypeEnum;
      percentage: string | null;
      fixed_amount: string | null;
    }>();

    expectTypeOf<ExpenseCreate>().toMatchTypeOf<{
      card_id: string;
      description: string;
      total_amount: string;
      purchase_date: string;
      installments_count?: number;
      first_billing_override?: string | null;
      notes?: string | null;
      splits: ExpenseSplitInput[];
    }>();

    expectTypeOf<ExpenseUpdate>().toMatchTypeOf<{
      card_id: string;
      description: string;
      total_amount: string;
      purchase_date: string;
      installments_count?: number;
      first_billing_override?: string | null;
      notes?: string | null;
      splits: ExpenseSplitInput[];
    }>();

    expectTypeOf<ExpenseRead>().toMatchTypeOf<{
      id: string;
      card_id: string;
      description: string;
      total_amount: string;
      purchase_date: string;
      installments_count: number;
      first_billing_override: string | null;
      notes: string | null;
      splits: ExpenseSplitRead[];
      created_at: string;
      updated_at: string;
    }>();
  });

  it('should enforce schedule and breakdown response typing with string amounts', () => {
    expectTypeOf<PersonShareScheduleItem>().toMatchTypeOf<{
      person_id: string;
      person_name: string;
      amount: string;
    }>();

    expectTypeOf<InstallmentScheduleItem>().toMatchTypeOf<{
      installment_number: number;
      installments_count: number;
      installment_label: string;
      statement_period: string;
      payment_period: string;
      closing_date: string;
      due_date: string;
      installment_amount: string;
      person_shares: PersonShareScheduleItem[];
    }>();

    expectTypeOf<ExpenseScheduleResponse>().toMatchTypeOf<{
      expense_id: string;
      description: string;
      card_id: string;
      card_name: string;
      currency: string;
      total_amount: string;
      installments_count: number;
      schedule: InstallmentScheduleItem[];
    }>();
  });

  it('should enforce strict typing for Dashboard summary and projection contracts', () => {
    expectTypeOf<CardPersonBreakdown>().toMatchTypeOf<{
      person_id: string;
      person_name: string;
      purchases_amount?: string;
      fee_share?: string;
      amount_due: string;
    }>();

    expectTypeOf<CardMonthlySummary>().toMatchTypeOf<{
      card_id: string;
      card_name: string;
      currency: CurrencyEnum;
      closing_date: string;
      due_date: string;
      purchases_total?: string;
      maintenance_fee?: string;
      total_due: string;
      by_person: CardPersonBreakdown[];
    }>();

    expectTypeOf<PersonMonthlySummary>().toMatchTypeOf<{
      person_id: string;
      person_name: string;
      totals_by_currency: Record<string, string>;
    }>();

    expectTypeOf<ActiveInstallmentShare>().toMatchTypeOf<{
      person_id: string;
      person_name: string;
      amount: string;
    }>();

    expectTypeOf<ActiveInstallmentItem>().toMatchTypeOf<{
      expense_id: string;
      description: string;
      card_id: string;
      card_name: string;
      currency: CurrencyEnum;
      purchase_date: string;
      installment_number: number;
      installments_count: number;
      installment_label: string;
      installment_amount: string;
      person_shares: ActiveInstallmentShare[];
    }>();

    expectTypeOf<DashboardSummaryResponse>().toMatchTypeOf<{
      period: string;
      totals_by_currency: Record<string, string>;
      by_card: CardMonthlySummary[];
      by_person: PersonMonthlySummary[];
      active_installments: ActiveInstallmentItem[];
    }>();

    expectTypeOf<DashboardProjectionResponse>().toMatchTypeOf<{
      start_period: string;
      months: number;
      periods: DashboardSummaryResponse[];
    }>();
  });

  it('should verify validation error and query parameter contracts', () => {
    expectTypeOf<ValidationError>().toEqualTypeOf<ValidationErrorItem>();
    expectTypeOf<ValidationErrorItem>().toMatchTypeOf<{
      loc: (string | number)[];
      msg: string;
      type: string;
      input?: unknown;
      ctx?: Record<string, unknown>;
    }>();

    expectTypeOf<HTTPValidationError>().toMatchTypeOf<{
      detail?: ValidationErrorItem[];
    }>();

    expectTypeOf<ApiErrorDetail>().toEqualTypeOf<string | ValidationErrorItem[]>();

    expectTypeOf<CardFilters>().toMatchTypeOf<{
      is_active?: boolean;
      currency?: CurrencyEnum;
    }>();

    expectTypeOf<PersonFilters>().toMatchTypeOf<{
      is_active?: boolean;
    }>();

    expectTypeOf<ExpenseFilters>().toMatchTypeOf<{
      card_id?: string;
      person_id?: string;
      date_from?: string;
      date_to?: string;
      active_in_period?: string;
    }>();

    expectTypeOf<DashboardSummaryParams>().toMatchTypeOf<{
      period?: string;
    }>();

    expectTypeOf<DashboardProjectionParams>().toMatchTypeOf<{
      start_period?: string;
      months?: number;
    }>();
  });
});
