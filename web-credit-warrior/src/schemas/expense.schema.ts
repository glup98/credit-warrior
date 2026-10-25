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
      .preprocess(
        (val) => (val === '' ? null : val),
        z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de período requerido: YYYY-MM')
          .nullable()
          .optional(),
      ),
    notes: z.string().max(2000, 'Máximo 2000 caracteres').nullable().optional(),
    splits: z
      .array(expenseSplitInputSchema)
      .min(1, 'Debes asignar al menos un participante al gasto'),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Unicidad de person_id dentro de splits
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

export type ExpenseSplitInputDto = z.infer<typeof expenseSplitInputSchema>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
