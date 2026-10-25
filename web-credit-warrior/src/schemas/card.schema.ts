import { z } from 'zod';

export const currencyEnumSchema = z.enum(['CLP', 'USD']);

export const decimalStringRegex = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
export const integerStringRegex = /^(?:0|[1-9]\d*)$/;

export const defaultMonthlyFeeSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'string' && val.trim() === '') return '0';
    if (typeof val === 'string') return val.trim();
    return val;
  },
  z
    .string()
    .refine(
      (val) => decimalStringRegex.test(val),
      'Debe ser un monto válido mayor o igual a 0 con hasta 2 decimales',
    )
    .default('0'),
);

const optionalFeeUpdateSchema = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === 'string' && val.trim() === '') return '0';
    if (typeof val === 'string') return val.trim();
    return val;
  },
  z
    .string()
    .refine(
      (val) => decimalStringRegex.test(val),
      'Debe ser un monto válido mayor o igual a 0 con hasta 2 decimales',
    )
    .nullable()
    .optional(),
);

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
    default_monthly_fee: defaultMonthlyFeeSchema,
    is_active: z.boolean().default(true),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.currency === 'CLP' && !integerStringRegex.test(data.default_monthly_fee)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para CLP el monto de mantención debe ser un número entero sin decimales',
        path: ['default_monthly_fee'],
      });
    }
  });

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
    default_monthly_fee: optionalFeeUpdateSchema,
    is_active: z.boolean().nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.currency === 'CLP' &&
      data.default_monthly_fee != null &&
      !integerStringRegex.test(data.default_monthly_fee)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para CLP el monto de mantención debe ser un número entero sin decimales',
        path: ['default_monthly_fee'],
      });
    }
  });

export const cardMonthlyFeeSchema = z
  .object({
    fee: defaultMonthlyFeeSchema,
  })
  .strict();

export type CardCreateInput = z.infer<typeof cardCreateSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
export type CardMonthlyFeeInput = z.infer<typeof cardMonthlyFeeSchema>;
