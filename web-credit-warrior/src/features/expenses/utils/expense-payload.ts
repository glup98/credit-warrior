import type { ExpenseRead, ExpenseUpdate, ExpenseSplitInput } from '@/types/api.types';

export interface ExpenseEditValues {
  description: string;
  first_billing_override?: string | null;
  notes?: string | null;
}

/**
 * Sanitiza los datos de un gasto existente y sus splits para despachar un PUT limpio
 * conforme al esquema estricto ExpenseUpdate, eliminando metadatos de lectura (id, created_at, updated_at)
 * y normalizando cadenas vacías a null.
 */
export function sanitizeExpenseUpdatePayload(
  currentExpense: ExpenseRead,
  updatedValues: ExpenseEditValues,
): ExpenseUpdate {
  const isOverrideEmpty =
    !updatedValues.first_billing_override || updatedValues.first_billing_override.trim() === '';
  const areNotesEmpty = !updatedValues.notes || updatedValues.notes.trim() === '';

  const sanitizedSplits: ExpenseSplitInput[] = currentExpense.splits.map((split) => {
    if (split.split_type === 'EQUAL') {
      return {
        person_id: split.person_id,
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      };
    }
    if (split.split_type === 'PERCENTAGE') {
      return {
        person_id: split.person_id,
        split_type: 'PERCENTAGE',
        percentage: split.percentage ? String(split.percentage).trim() : null,
        fixed_amount: null,
      };
    }
    return {
      person_id: split.person_id,
      split_type: 'FIXED_AMOUNT',
      percentage: null,
      fixed_amount: split.fixed_amount ? String(split.fixed_amount).trim() : null,
    };
  });

  return {
    card_id: currentExpense.card_id,
    description: updatedValues.description.trim(),
    total_amount: currentExpense.total_amount,
    purchase_date: currentExpense.purchase_date,
    installments_count: currentExpense.installments_count,
    first_billing_override: isOverrideEmpty
      ? null
      : updatedValues.first_billing_override?.trim() ?? null,
    notes: areNotesEmpty ? null : updatedValues.notes?.trim() ?? null,
    splits: sanitizedSplits,
  };
}
