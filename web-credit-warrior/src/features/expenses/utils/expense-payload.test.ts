import { describe, it, expect } from 'vitest';
import type { ExpenseRead } from '@/types/api.types';
import { expenseUpdateSchema } from '@/schemas/expense.schema';
import {
  sanitizeExpenseUpdatePayload,
  type ExpenseEditValues,
} from './expense-payload';

describe('sanitizeExpenseUpdatePayload (Spec 005 T1)', () => {
  const baseExpenseRead: ExpenseRead = {
    id: '11111111-1111-4111-8111-111111111111',
    card_id: '22222222-2222-4222-8222-222222222222',
    description: 'Compra Original',
    total_amount: '100000',
    purchase_date: '2026-10-15',
    installments_count: 3,
    first_billing_override: '2026-11',
    notes: 'Nota previa',
    created_at: '2026-10-15T12:00:00Z',
    updated_at: '2026-10-15T12:00:00Z',
    splits: [
      {
        id: 'aaaaaaaa-1111-4111-8111-111111111111',
        person_id: '33333333-3333-4333-8333-333333333333',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
      {
        id: 'bbbbbbbb-2222-4222-8222-222222222222',
        person_id: '44444444-4444-4444-8444-444444444444',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
  };

  it('preserva íntegros los atributos estructurales requeridos por ExpenseUpdate', () => {
    const editValues: ExpenseEditValues = {
      description: 'Descripción Actualizada',
      first_billing_override: '2026-12',
      notes: 'Nueva nota',
    };

    const payload = sanitizeExpenseUpdatePayload(baseExpenseRead, editValues);

    expect(payload.card_id).toBe(baseExpenseRead.card_id);
    expect(payload.total_amount).toBe(baseExpenseRead.total_amount);
    expect(payload.purchase_date).toBe(baseExpenseRead.purchase_date);
    expect(payload.installments_count).toBe(baseExpenseRead.installments_count);
    expect(payload.description).toBe('Descripción Actualizada');
    expect(payload.first_billing_override).toBe('2026-12');
    expect(payload.notes).toBe('Nueva nota');
  });

  it('descarta estrictamente metadatos de base de datos (id, created_at, updated_at) en splits', () => {
    // Añadimos metadatos ficticios adicionales que vendrían de la API
    const expenseWithMeta = {
      ...baseExpenseRead,
      splits: [
        {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          person_id: '33333333-3333-4333-8333-333333333333',
          split_type: 'EQUAL' as const,
          percentage: null,
          fixed_amount: null,
          created_at: '2026-10-15T12:00:00Z',
          updated_at: '2026-10-15T12:00:00Z',
        },
      ],
    } as unknown as ExpenseRead;

    const payload = sanitizeExpenseUpdatePayload(expenseWithMeta, {
      description: 'Sin metadatos',
    });

    expect(payload.splits).toHaveLength(1);
    const split = payload.splits[0];
    expect(split).toEqual({
      person_id: '33333333-3333-4333-8333-333333333333',
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    });
    expect(split).not.toHaveProperty('id');
    expect(split).not.toHaveProperty('created_at');
    expect(split).not.toHaveProperty('updated_at');

    // Valida contra el esquema Zod estricto (extra="forbid")
    const parseResult = expenseUpdateSchema.safeParse(payload);
    expect(parseResult.success).toBe(true);
  });

  it('en modo EQUAL purga percentage y fixed_amount a null', () => {
    const expenseWithEqualDirty = {
      ...baseExpenseRead,
      splits: [
        {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          person_id: '33333333-3333-4333-8333-333333333333',
          split_type: 'EQUAL' as const,
          percentage: '50.00',
          fixed_amount: '50000',
        },
      ],
    } as unknown as ExpenseRead;

    const payload = sanitizeExpenseUpdatePayload(expenseWithEqualDirty, {
      description: 'Compra Limpia',
    });

    expect(payload.splits[0]).toEqual({
      person_id: '33333333-3333-4333-8333-333333333333',
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    });
  });

  it('en modo PERCENTAGE mantiene percentage y purga fixed_amount a null', () => {
    const expensePercentage: ExpenseRead = {
      ...baseExpenseRead,
      splits: [
        {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          person_id: '33333333-3333-4333-8333-333333333333',
          split_type: 'PERCENTAGE',
          percentage: '50.00',
          fixed_amount: null,
        },
        {
          id: 'bbbbbbbb-2222-4222-8222-222222222222',
          person_id: '44444444-4444-4444-8444-444444444444',
          split_type: 'PERCENTAGE',
          percentage: '50.00',
          fixed_amount: null,
        },
      ],
    };

    const payload = sanitizeExpenseUpdatePayload(expensePercentage, {
      description: 'Gasto Porcentual',
    });

    expect(payload.splits).toEqual([
      {
        person_id: '33333333-3333-4333-8333-333333333333',
        split_type: 'PERCENTAGE',
        percentage: '50.00',
        fixed_amount: null,
      },
      {
        person_id: '44444444-4444-4444-8444-444444444444',
        split_type: 'PERCENTAGE',
        percentage: '50.00',
        fixed_amount: null,
      },
    ]);

    const parseResult = expenseUpdateSchema.safeParse(payload);
    expect(parseResult.success).toBe(true);
  });

  it('en modo FIXED_AMOUNT mantiene fixed_amount y purga percentage a null', () => {
    const expenseFixed: ExpenseRead = {
      ...baseExpenseRead,
      total_amount: '100000',
      splits: [
        {
          id: 'aaaaaaaa-1111-4111-8111-111111111111',
          person_id: '33333333-3333-4333-8333-333333333333',
          split_type: 'FIXED_AMOUNT',
          percentage: null,
          fixed_amount: '60000',
        },
        {
          id: 'bbbbbbbb-2222-4222-8222-222222222222',
          person_id: '44444444-4444-4444-8444-444444444444',
          split_type: 'FIXED_AMOUNT',
          percentage: null,
          fixed_amount: '40000',
        },
      ],
    };

    const payload = sanitizeExpenseUpdatePayload(expenseFixed, {
      description: 'Gasto Monto Fijo',
    });

    expect(payload.splits).toEqual([
      {
        person_id: '33333333-3333-4333-8333-333333333333',
        split_type: 'FIXED_AMOUNT',
        percentage: null,
        fixed_amount: '60000',
      },
      {
        person_id: '44444444-4444-4444-8444-444444444444',
        split_type: 'FIXED_AMOUNT',
        percentage: null,
        fixed_amount: '40000',
      },
    ]);

    const parseResult = expenseUpdateSchema.safeParse(payload);
    expect(parseResult.success).toBe(true);
  });

  it('normaliza cadenas vacías o compuestas de solo espacios a null en first_billing_override y notes', () => {
    const payloadWithBlanks = sanitizeExpenseUpdatePayload(baseExpenseRead, {
      description: '   Descripción con espacios   ',
      first_billing_override: '   ',
      notes: '     \n  ',
    });

    expect(payloadWithBlanks.description).toBe('Descripción con espacios');
    expect(payloadWithBlanks.first_billing_override).toBeNull();
    expect(payloadWithBlanks.notes).toBeNull();

    const payloadWithEmpty = sanitizeExpenseUpdatePayload(baseExpenseRead, {
      description: 'Sin opcionales',
      first_billing_override: '',
      notes: '',
    });

    expect(payloadWithEmpty.first_billing_override).toBeNull();
    expect(payloadWithEmpty.notes).toBeNull();

    const payloadWithUndefined = sanitizeExpenseUpdatePayload(baseExpenseRead, {
      description: 'Opcionales omitidos',
    });

    expect(payloadWithUndefined.first_billing_override).toBeNull();
    expect(payloadWithUndefined.notes).toBeNull();
  });
});
