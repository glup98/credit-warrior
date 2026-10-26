'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Pencil,
  Lock,
  CreditCard,
  Calendar,
  Hash,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateExpense } from '@/hooks/queries/use-expenses';
import { useMediaQuery } from '@/hooks/use-media-query';
import { queryKeys } from '@/lib/query-keys';
import {
  formatDate,
  formatCurrency,
  formatMaskedCard,
  type Currency,
} from '@/lib/formatters';
import { cn, mapPydanticErrorsToForm } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { sanitizeExpenseUpdatePayload } from '../utils/expense-payload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

export const expenseEditFormSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, 'La descripción es obligatoria')
      .max(255, 'Máximo 255 caracteres'),
    first_billing_override: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de período inválido (YYYY-MM)')
      .or(z.literal(''))
      .nullable()
      .optional(),
    notes: z.string().max(2000, 'Máximo 2000 caracteres').nullable().optional(),
  })
  .strict();

export type ExpenseEditFormData = z.infer<typeof expenseEditFormSchema>;

export interface ExpenseEditDialogProps {
  expense: ExpenseRead | null;
  card?: CardRead;
  cards?: CardRead[];
  persons?: PersonRead[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  className?: string;
}

/**
 * Formulario Adaptativo de Edición de Compras (Spec 005 T6).
 * - Modal adaptativo: Dialog en pantallas de escritorio (>= 768px), Drawer en móviles (< 768px).
 * - Muestra datos estructurales inmutables (monto, cuotas, tarjeta, splits) en modo informativo de solo lectura.
 * - Campos editables: description, first_billing_override y notes.
 * - Protección anti-cierre accidental: dismissible={!isDirty} cuando el usuario ha modificado el formulario.
 * - Despacha useUpdateExpense enviando el payload sanitizado con sanitizeExpenseUpdatePayload.
 * - Mapea inline errores 422 con mapPydanticErrorsToForm y tolera errores concurrentes 404.
 */
export function ExpenseEditDialog({
  expense,
  card,
  cards = [],
  persons = [],
  open = false,
  onOpenChange,
  onSuccess,
  className,
}: ExpenseEditDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const queryClient = useQueryClient();
  const updateExpenseMutation = useUpdateExpense();

  // Resolución de tarjeta y personas asociadas
  const resolvedCard = React.useMemo(() => {
    if (card) return card;
    if (expense?.card_id && cards.length > 0) {
      return cards.find((c) => c.id === expense.card_id);
    }
    return undefined;
  }, [card, expense?.card_id, cards]);

  const personsMap = React.useMemo(() => {
    return new Map(persons.map((p) => [p.id, p]));
  }, [persons]);

  const currency: Currency = (resolvedCard?.currency as Currency) ?? 'CLP';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExpenseEditFormData>({
    resolver: zodResolver(expenseEditFormSchema),
    defaultValues: {
      description: expense?.description ?? '',
      first_billing_override: expense?.first_billing_override ?? '',
      notes: expense?.notes ?? '',
    },
  });

  // Sincronizar datos al cambiar de gasto o abrir el diálogo
  React.useEffect(() => {
    if (expense && open) {
      reset({
        description: expense.description,
        first_billing_override: expense.first_billing_override ?? '',
        notes: expense.notes ?? '',
      });
    }
  }, [expense, open, reset]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isDirty) {
        // Bloquear cierre accidental si hay modificaciones
        return;
      }
      onOpenChange?.(nextOpen);
    },
    [isDirty, onOpenChange],
  );

  const handleCancel = React.useCallback(() => {
    if (expense) {
      reset({
        description: expense.description,
        first_billing_override: expense.first_billing_override ?? '',
        notes: expense.notes ?? '',
      });
    }
    onOpenChange?.(false);
  }, [expense, reset, onOpenChange]);

  const onSubmit = async (data: ExpenseEditFormData) => {
    if (!expense) return;

    const sanitizedPayload = sanitizeExpenseUpdatePayload(expense, {
      description: data.description,
      first_billing_override: data.first_billing_override || null,
      notes: data.notes || null,
    });

    try {
      await updateExpenseMutation.mutateAsync({
        id: expense.id,
        data: sanitizedPayload,
      });

      toast.success('Compra actualizada exitosamente');
      reset(data);
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.info('La compra seleccionada ya no existe');
          queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
          onOpenChange?.(false);
          return;
        }

        if (err.isValidationError) {
          const mapped = mapPydanticErrorsToForm(err, setError);
          if (mapped) {
            return;
          }
        }
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar la compra';
      toast.error(errorMessage);
    }
  };

  if (!open || !expense) {
    return null;
  }

  const isSaving = isSubmitting || updateExpenseMutation.isPending;

  // Encabezado descriptivo
  const headerContent = (
    <div className="space-y-1 text-left">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
          <Pencil className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-bold text-text-primary">Editar compra</h2>
      </div>
      <p className="text-xs text-text-muted">
        Modifica los datos descriptivos de la compra. Los datos financieros y de
        reparto están protegidos por integridad contable.
      </p>
    </div>
  );

  // Panel informativo de datos estructurales inmutables
  const structuralInfoPanel = (
    <section
      aria-label="Información financiera inmutable"
      className="space-y-3 rounded-xl border border-border-subtle bg-elevated/60 p-3.5 text-xs text-text-muted"
    >
      <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-medium text-text-primary">
            {resolvedCard?.name ?? 'Tarjeta'}
          </span>
          {resolvedCard?.last_four_digits && (
            <span className="font-mono text-text-muted">
              ({formatMaskedCard(resolvedCard.last_four_digits)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CurrencyBadge currency={currency} className="text-[11px] px-1.5 py-0" />
          <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
            {formatCurrency(expense.total_amount, currency)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="truncate">
            Fecha: <strong className="text-text-primary font-normal">{formatDate(expense.purchase_date)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span>
            Plazo: <strong className="text-text-primary font-normal">{expense.installments_count} {expense.installments_count === 1 ? 'cuota' : 'cuotas'}</strong>
          </span>
        </div>
      </div>

      {expense.splits && expense.splits.length > 0 && (
        <div className="border-t border-border-subtle/50 pt-2 space-y-1.5">
          <div className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
            <Users className="h-3 w-3" />
            <span>Reparto ({expense.splits.length} participantes)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {expense.splits.map((split) => {
              const person = personsMap.get(split.person_id);
              const displayName = person?.name ?? split.person_id;
              return (
                <div
                  key={split.id ?? split.person_id}
                  className="flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[11px] border border-border-subtle/80"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: person?.color_hex ?? '#10B981' }}
                  />
                  <span className="text-text-primary font-medium">{displayName}</span>
                  {split.split_type === 'EQUAL' && (
                    <span className="text-[10px] text-text-muted">(Partes iguales)</span>
                  )}
                  {split.split_type === 'PERCENTAGE' && split.percentage && (
                    <span className="text-[10px] font-mono text-text-muted">
                      ({split.percentage}%)
                    </span>
                  )}
                  {split.split_type === 'FIXED_AMOUNT' && split.fixed_amount && (
                    <span className="text-[10px] font-mono text-text-muted">
                      ({formatCurrency(split.fixed_amount, currency)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-text-muted/80">
        <Lock className="h-3 w-3 text-text-muted shrink-0" />
        <span>Monto, cuotas y participantes protegidos contra modificaciones no auditadas.</span>
      </div>
    </section>
  );

  // Formulario con campos editables
  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
      {structuralInfoPanel}

      {/* Descripción */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="edit-description"
          className="text-xs font-medium text-text-primary"
        >
          Descripción / Comercio <span className="text-rose-500">*</span>
        </label>
        <input
          id="edit-description"
          type="text"
          disabled={isSaving}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'edit-description-error' : undefined}
          placeholder="Ej. Supermercado Líder"
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary shadow-xs transition-colors placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald',
            errors.description
              ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
              : 'border-border-subtle hover:border-border-subtle/80',
          )}
          {...register('description')}
        />
        {errors.description && (
          <p
            id="edit-description-error"
            role="alert"
            className="flex items-center gap-1 text-xs text-rose-500"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{errors.description.message}</span>
          </p>
        )}
      </div>

      {/* Período de primera cuota */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="edit-first-billing-override"
          className="text-xs font-medium text-text-primary"
        >
          Período de primera cuota (opcional)
        </label>
        <input
          id="edit-first-billing-override"
          type="text"
          disabled={isSaving}
          aria-invalid={Boolean(errors.first_billing_override)}
          aria-describedby={
            errors.first_billing_override
              ? 'edit-first-billing-override-error'
              : 'edit-first-billing-override-hint'
          }
          placeholder="YYYY-MM (ej. 2026-11)"
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 font-mono text-sm text-text-primary shadow-xs transition-colors placeholder:text-text-muted/60 focus:outline-hidden focus:ring-2 focus:ring-brand-emerald focus:border-brand-emerald',
            errors.first_billing_override
              ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
              : 'border-border-subtle hover:border-border-subtle/80',
          )}
          {...register('first_billing_override')}
        />
        {errors.first_billing_override ? (
          <p
            id="edit-first-billing-override-error"
            role="alert"
            className="flex items-center gap-1 text-xs text-rose-500"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{errors.first_billing_override.message}</span>
          </p>
        ) : (
          <p
            id="edit-first-billing-override-hint"
            className="text-[11px] text-text-muted"
          >
            Dejar en blanco para cálculo automático según fecha de corte de la tarjeta.
          </p>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="edit-notes"
          className="text-xs font-medium text-text-primary"
        >
          Notas o comentarios (opcional)
        </label>
        <Textarea
          id="edit-notes"
          disabled={isSaving}
          rows={3}
          error={Boolean(errors.notes)}
          placeholder="Detalles adicionales sobre la compra..."
          className="text-sm placeholder:text-text-muted/60"
          {...register('notes')}
        />
        {errors.notes && (
          <p role="alert" className="flex items-center gap-1 text-xs text-rose-500">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{errors.notes.message}</span>
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={handleCancel}
          className="min-h-[44px] sm:min-h-[36px]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="min-h-[44px] sm:min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>Guardar cambios</span>
          )}
        </Button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          className={cn(
            'max-w-lg max-h-[90dvh] overflow-y-auto border border-border-subtle bg-surface shadow-2xl sm:rounded-2xl p-6',
            className,
          )}
        >
          <DialogHeader className="pb-1">
            <DialogTitle asChild>{headerContent}</DialogTitle>
            <DialogDescription className="sr-only">
              Formulario de edición de compra
            </DialogDescription>
          </DialogHeader>

          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} dismissible={!isDirty}>
      <DrawerContent
        className={cn(
          'max-h-[92dvh] overflow-y-auto px-4 pb-6 border-t border-border-subtle bg-surface',
          className,
        )}
      >
        <DrawerHeader className="px-0 pt-2 pb-2">
          <DrawerTitle asChild>{headerContent}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Formulario de edición de compra
          </DrawerDescription>
        </DrawerHeader>

        {formContent}
      </DrawerContent>
    </Drawer>
  );
}
