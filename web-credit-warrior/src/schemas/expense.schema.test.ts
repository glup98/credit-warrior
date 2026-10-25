import { describe, it, expect } from 'vitest';
import {
  expenseSplitInputSchema,
  expenseCreateSchema,
  expenseUpdateSchema,
} from './expense.schema';

describe('Expense & Split Schemas', () => {
  const validPerson1 = '11111111-1111-4111-a111-111111111111';
  const validPerson2 = '22222222-2222-4222-a222-222222222222';
  const validPerson3 = '33333333-3333-4333-a333-333333333333';
  const validCard = '99999999-9999-4999-a999-999999999999';

  describe('expenseSplitInputSchema', () => {
    it('validates EQUAL split without percentage or fixed_amount', () => {
      const parsed = expenseSplitInputSchema.parse({
        person_id: validPerson1,
        split_type: 'EQUAL',
      });
      expect(parsed.person_id).toBe(validPerson1);
      expect(parsed.split_type).toBe('EQUAL');
    });

    it('defaults split_type to EQUAL when omitted', () => {
      const parsed = expenseSplitInputSchema.parse({
        person_id: validPerson1,
      });
      expect(parsed.split_type).toBe('EQUAL');
    });

    it('validates PERCENTAGE split with valid percentage string', () => {
      const parsed = expenseSplitInputSchema.parse({
        person_id: validPerson1,
        split_type: 'PERCENTAGE',
        percentage: '50.00',
      });
      expect(parsed.percentage).toBe('50.00');
    });

    it('rejects percentage <= 0 or > 100', () => {
      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'PERCENTAGE',
          percentage: '0',
        }),
      ).toThrow();

      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'PERCENTAGE',
          percentage: '0.00',
        }),
      ).toThrow();

      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'PERCENTAGE',
          percentage: '100.01',
        }),
      ).toThrow();
    });

    it('validates FIXED_AMOUNT split with valid fixed_amount string', () => {
      const parsed = expenseSplitInputSchema.parse({
        person_id: validPerson1,
        split_type: 'FIXED_AMOUNT',
        fixed_amount: '50000',
      });
      expect(parsed.fixed_amount).toBe('50000');
    });

    it('rejects fixed_amount <= 0 or invalid decimal format', () => {
      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'FIXED_AMOUNT',
          fixed_amount: '0',
        }),
      ).toThrow();

      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'FIXED_AMOUNT',
          fixed_amount: '-100',
        }),
      ).toThrow();

      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'FIXED_AMOUNT',
          fixed_amount: '12.345',
        }),
      ).toThrow();
    });

    it('rejects non-uuid person_id', () => {
      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: 'invalid-id',
          split_type: 'EQUAL',
        }),
      ).toThrow();
    });

    it('rejects unknown properties due to .strict()', () => {
      expect(() =>
        expenseSplitInputSchema.parse({
          person_id: validPerson1,
          split_type: 'EQUAL',
          extra_key: 'danger',
        }),
      ).toThrow();
    });
  });

  describe('expenseCreateSchema and expenseUpdateSchema', () => {
    const validExpenseBase = {
      card_id: validCard,
      description: 'Supermercado Mensual',
      total_amount: '100000',
      purchase_date: '2026-10-20',
      installments_count: 1,
      first_billing_override: null,
      notes: 'Compra compartida',
    };

    it('validates a valid EQUAL split expense', () => {
      const payload = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'EQUAL' as const },
          { person_id: validPerson2, split_type: 'EQUAL' as const },
        ],
      };
      const parsed = expenseCreateSchema.parse(payload);
      expect(parsed.description).toBe('Supermercado Mensual');
      expect(parsed.splits).toHaveLength(2);
      expect(expenseUpdateSchema.parse(payload)).toEqual(parsed);
    });

    it('validates a valid PERCENTAGE split totaling exactly 100.00%', () => {
      const payload = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'PERCENTAGE' as const, percentage: '33.34' },
          { person_id: validPerson2, split_type: 'PERCENTAGE' as const, percentage: '33.33' },
          { person_id: validPerson3, split_type: 'PERCENTAGE' as const, percentage: '33.33' },
        ],
      };
      const parsed = expenseCreateSchema.parse(payload);
      expect(parsed.splits).toHaveLength(3);
    });

    it('rejects PERCENTAGE split if sum is not 100.00%', () => {
      const payloadUnder = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'PERCENTAGE' as const, percentage: '50.00' },
          { person_id: validPerson2, split_type: 'PERCENTAGE' as const, percentage: '49.99' },
        ],
      };
      expect(() => expenseCreateSchema.parse(payloadUnder)).toThrow(
        /100\.00%/,
      );

      const payloadOver = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'PERCENTAGE' as const, percentage: '50.00' },
          { person_id: validPerson2, split_type: 'PERCENTAGE' as const, percentage: '50.01' },
        ],
      };
      expect(() => expenseCreateSchema.parse(payloadOver)).toThrow(
        /100\.00%/,
      );
    });

    it('validates a valid FIXED_AMOUNT split totaling exactly total_amount', () => {
      const payload = {
        ...validExpenseBase,
        total_amount: '150.50',
        splits: [
          { person_id: validPerson1, split_type: 'FIXED_AMOUNT' as const, fixed_amount: '100.00' },
          { person_id: validPerson2, split_type: 'FIXED_AMOUNT' as const, fixed_amount: '50.50' },
        ],
      };
      const parsed = expenseCreateSchema.parse(payload);
      expect(parsed.total_amount).toBe('150.50');
    });

    it('rejects FIXED_AMOUNT split if sum does not match total_amount', () => {
      const payload = {
        ...validExpenseBase,
        total_amount: '100000',
        splits: [
          { person_id: validPerson1, split_type: 'FIXED_AMOUNT' as const, fixed_amount: '60000' },
          { person_id: validPerson2, split_type: 'FIXED_AMOUNT' as const, fixed_amount: '39999' },
        ],
      };
      expect(() => expenseCreateSchema.parse(payload)).toThrow(
        /monto total/i,
      );
    });

    it('rejects duplicate person_id in splits', () => {
      const payload = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'EQUAL' as const },
          { person_id: validPerson1, split_type: 'EQUAL' as const },
        ],
      };
      expect(() => expenseCreateSchema.parse(payload)).toThrow(
        /participante no puede repetirse/i,
      );
    });

    it('rejects mixed split_types in splits', () => {
      const payload = {
        ...validExpenseBase,
        splits: [
          { person_id: validPerson1, split_type: 'EQUAL' as const },
          { person_id: validPerson2, split_type: 'PERCENTAGE' as const, percentage: '50.00' },
        ],
      };
      expect(() => expenseCreateSchema.parse(payload)).toThrow(
        /mismo método de reparto/i,
      );
    });

    it('rejects empty splits array', () => {
      const payload = {
        ...validExpenseBase,
        splits: [],
      };
      expect(() => expenseCreateSchema.parse(payload)).toThrow();
    });

    it('rejects invalid purchase_date format', () => {
      expect(() =>
        expenseCreateSchema.parse({
          ...validExpenseBase,
          purchase_date: '20-10-2026',
          splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
        }),
      ).toThrow();
    });

    it('rejects invalid first_billing_override format', () => {
      expect(() =>
        expenseCreateSchema.parse({
          ...validExpenseBase,
          first_billing_override: '2026-13',
          splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
        }),
      ).toThrow();
    });

    it('accepts valid first_billing_override in YYYY-MM format', () => {
      const parsed = expenseCreateSchema.parse({
        ...validExpenseBase,
        first_billing_override: '2026-11',
        splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
      });
      expect(parsed.first_billing_override).toBe('2026-11');
    });

    it('rejects installments_count outside 1..120', () => {
      expect(() =>
        expenseCreateSchema.parse({
          ...validExpenseBase,
          installments_count: 0,
          splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
        }),
      ).toThrow();

      expect(() =>
        expenseCreateSchema.parse({
          ...validExpenseBase,
          installments_count: 121,
          splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
        }),
      ).toThrow();
    });

    it('rejects extra unknown properties due to .strict()', () => {
      expect(() =>
        expenseCreateSchema.parse({
          ...validExpenseBase,
          extra_payload_field: 'illegal',
          splits: [{ person_id: validPerson1, split_type: 'EQUAL' as const }],
        }),
      ).toThrow();
    });
  });
});
