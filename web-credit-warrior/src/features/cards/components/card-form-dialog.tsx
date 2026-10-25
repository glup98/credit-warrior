'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  currencyEnumSchema,
  defaultMonthlyFeeSchema,
  integerStringRegex,
} from '@/schemas/card.schema';
import { useCreateCard, useUpdateCard } from '@/hooks/queries/use-cards';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { mapPydanticErrorsToForm, cn } from '@/lib/utils';
import type { CardRead, CardCreate, CardUpdate, CurrencyEnum } from '@/types/api.types';

const cardFormSchema = z
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
      .optional()
      .or(z.literal('')),
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
    if (
      data.currency === 'CLP' &&
      !integerStringRegex.test(data.default_monthly_fee)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Para CLP el monto de mantención debe ser un número entero sin decimales',
        path: ['default_monthly_fee'],
      });
    }
  });

type CardFormValues = z.infer<typeof cardFormSchema>;

export interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CardRead | null;
  onSuccess?: (card: CardRead) => void;
}

export function CardFormDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: CardFormDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const isEditing = Boolean(card);

  const createCardMutation = useCreateCard();
  const updateCardMutation = useUpdateCard();
  const isPending = createCardMutation.isPending || updateCardMutation.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: '',
      last_four_digits: '',
      currency: 'CLP',
      closing_day: '' as unknown as number,
      due_day: '' as unknown as number,
      default_monthly_fee: '0',
      is_active: true,
    },
  });

  const selectedCurrency = watch('currency') as CurrencyEnum;
  const isActive = watch('is_active');

  React.useEffect(() => {
    if (open) {
      if (card) {
        reset({
          name: card.name,
          last_four_digits: card.last_four_digits ?? '',
          currency: card.currency,
          closing_day: card.closing_day,
          due_day: card.due_day,
          default_monthly_fee: card.default_monthly_fee ?? '0',
          is_active: card.is_active,
        });
      } else {
        reset({
          name: '',
          last_four_digits: '',
          currency: 'CLP',
          closing_day: '' as unknown as number,
          due_day: '' as unknown as number,
          default_monthly_fee: '0',
          is_active: true,
        });
      }
    }
  }, [open, card, reset]);

  const onSubmit = async (values: CardFormValues) => {
    const trimmedDigits = values.last_four_digits?.trim();
    const normalizedDigits =
      trimmedDigits && trimmedDigits.length > 0 ? trimmedDigits : null;
    const normalizedFee = values.default_monthly_fee?.trim()
      ? values.default_monthly_fee.trim()
      : '0';

    try {
      if (isEditing && card) {
        const payload: CardUpdate = {
          name: values.name.trim(),
          last_four_digits: normalizedDigits,
          currency: values.currency,
          closing_day: Number(values.closing_day),
          due_day: Number(values.due_day),
          default_monthly_fee: normalizedFee,
          is_active: values.is_active,
        };
        const updated = await updateCardMutation.mutateAsync({
          id: card.id,
          data: payload,
        });
        toast.success('Tarjeta actualizada exitosamente');
        onSuccess?.(updated);
        onOpenChange(false);
      } else {
        const payload: CardCreate = {
          name: values.name.trim(),
          last_four_digits: normalizedDigits,
          currency: values.currency,
          closing_day: Number(values.closing_day),
          due_day: Number(values.due_day),
          default_monthly_fee: normalizedFee,
          is_active: values.is_active,
        };
        const created = await createCardMutation.mutateAsync(payload);
        toast.success('Tarjeta creada exitosamente');
        onSuccess?.(created);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const handled = mapPydanticErrorsToForm(err, setError);
      if (!handled) {
        toast.error(
          isEditing
            ? 'No se pudo actualizar la tarjeta'
            : 'No se pudo crear la tarjeta',
        );
      }
    }
  };

  const formBody = (
    <form
      id="card-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 py-2"
    >
      {/* Nombre de la tarjeta */}
      <div className="space-y-1.5">
        <Label htmlFor="card-name">Nombre de la tarjeta</Label>
        <Input
          id="card-name"
          placeholder="Ej. Santander Black, BCI Visa Signature"
          error={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-accent-danger">{errors.name.message}</p>
        )}
      </div>

      {/* Últimos 4 dígitos */}
      <div className="space-y-1.5">
        <Label htmlFor="card-digits">Últimos 4 dígitos (opcional)</Label>
        <Input
          id="card-digits"
          placeholder="1234"
          maxLength={4}
          className="font-mono"
          error={Boolean(errors.last_four_digits)}
          {...register('last_four_digits')}
        />
        {errors.last_four_digits && (
          <p className="text-xs text-accent-danger">
            {errors.last_four_digits.message}
          </p>
        )}
      </div>

      {/* Moneda de Facturación */}
      <div className="space-y-1.5">
        <Label>Moneda de facturación</Label>
        <div
          role="radiogroup"
          aria-label="Moneda de facturación"
          className="grid grid-cols-2 gap-2"
        >
          <button
            type="button"
            role="radio"
            aria-checked={selectedCurrency === 'CLP'}
            onClick={() => setValue('currency', 'CLP', { shouldValidate: true })}
            className={cn(
              'flex items-center justify-center rounded-lg border p-2.5 text-sm font-medium transition-all',
              selectedCurrency === 'CLP'
                ? 'border-accent-clp bg-accent-clp/15 text-accent-clp font-semibold'
                : 'border-border-subtle bg-canvas text-text-muted hover:border-border-subtle/80 hover:text-text-primary',
            )}
          >
            CLP (Pesos)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={selectedCurrency === 'USD'}
            onClick={() => setValue('currency', 'USD', { shouldValidate: true })}
            className={cn(
              'flex items-center justify-center rounded-lg border p-2.5 text-sm font-medium transition-all',
              selectedCurrency === 'USD'
                ? 'border-accent-usd bg-accent-usd/15 text-accent-usd font-semibold'
                : 'border-border-subtle bg-canvas text-text-muted hover:border-border-subtle/80 hover:text-text-primary',
            )}
          >
            USD (Dólares)
          </button>
        </div>
      </div>

      {/* Mantención mensual base */}
      <div className="space-y-1.5">
        <Label htmlFor="card-fee">Mantención mensual base</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-text-muted">
            {selectedCurrency === 'CLP' ? '$' : 'US$'}
          </span>
          <Input
            id="card-fee"
            className="pl-10 font-mono tabular-nums"
            placeholder={selectedCurrency === 'CLP' ? '0' : '0.00'}
            error={Boolean(errors.default_monthly_fee)}
            {...register('default_monthly_fee')}
          />
        </div>
        <p className="text-[11px] text-text-muted leading-tight">
          Costo fijo mensual cobrado por el banco (ej. mantención de cuenta o tarjeta). Si no tiene costo, déjalo en 0.
        </p>
        {errors.default_monthly_fee && (
          <p className="text-xs text-accent-danger">
            {errors.default_monthly_fee.message}
          </p>
        )}
      </div>

      {/* Días de corte y vencimiento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-closing-day">Día de corte</Label>
          <Input
            id="card-closing-day"
            type="number"
            min={1}
            max={31}
            placeholder="Ej. 20"
            error={Boolean(errors.closing_day)}
            {...register('closing_day')}
          />
          {errors.closing_day && (
            <p className="text-xs text-accent-danger">
              {errors.closing_day.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-due-day">Día de pago</Label>
          <Input
            id="card-due-day"
            type="number"
            min={1}
            max={31}
            placeholder="Ej. 5"
            error={Boolean(errors.due_day)}
            {...register('due_day')}
          />
          {errors.due_day && (
            <p className="text-xs text-accent-danger">
              {errors.due_day.message}
            </p>
          )}
        </div>
      </div>

      {/* Nota sobre el día 31 en meses cortos */}
      <div className="flex items-start gap-2 rounded-lg border border-border-subtle/60 bg-canvas/60 p-2.5 text-xs text-text-muted">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/70" />
        <p>
          Si configuras día 31, el backend ajustará automáticamente el
          vencimiento al último día de meses con 28, 29 o 30 días.
        </p>
      </div>

      {/* Switch Tarjeta Activa */}
      <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-canvas/40 p-3">
        <div className="space-y-0.5">
          <Label htmlFor="card-is-active" className="cursor-pointer">
            Tarjeta Activa
          </Label>
          <p className="text-xs text-text-muted">
            Las tarjetas activas están disponibles al registrar nuevas compras.
          </p>
        </div>
        <Switch
          id="card-is-active"
          aria-label="Tarjeta Activa"
          checked={isActive}
          onCheckedChange={(val) => setValue('is_active', val)}
        />
      </div>
    </form>
  );

  const titleText = isEditing
    ? 'Editar Tarjeta de Crédito'
    : 'Nueva Tarjeta de Crédito';
  const descriptionText = isEditing
    ? 'Modifica los parámetros y ciclo de facturación de la tarjeta.'
    : 'Ingresa los datos para registrar una nueva tarjeta de crédito.';

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent-clp" />
              {titleText}
            </DialogTitle>
            <DialogDescription>{descriptionText}</DialogDescription>
          </DialogHeader>

          {formBody}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="card-form"
              disabled={isPending}
              className="bg-accent-clp text-canvas hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Tarjeta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent-clp" />
            {titleText}
          </DrawerTitle>
          <DrawerDescription>{descriptionText}</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[75vh] overflow-y-auto px-1">
          {formBody}
        </div>

        <DrawerFooter className="gap-2 px-0 pt-4">
          <Button
            type="submit"
            form="card-form"
            disabled={isPending}
            className="w-full bg-accent-clp text-canvas hover:brightness-110 active:scale-[0.98] transition-all"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Tarjeta'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
