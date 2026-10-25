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

export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
