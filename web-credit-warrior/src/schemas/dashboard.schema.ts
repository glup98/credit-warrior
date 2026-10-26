import { z } from 'zod';

export const periodStringSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El formato del período debe ser YYYY-MM');

export const dashboardSummaryParamsSchema = z
  .object({
    period: periodStringSchema.optional().nullable(),
  })
  .strict();

export const dashboardProjectionParamsSchema = z
  .object({
    start_period: periodStringSchema.optional().nullable(),
    months: z
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Mínimo 1 mes')
      .max(24, 'Máximo 24 meses')
      .default(6),
  })
  .strict();

export type DashboardSummaryParams = z.infer<typeof dashboardSummaryParamsSchema>;
export type DashboardProjectionParams = z.infer<typeof dashboardProjectionParamsSchema>;
