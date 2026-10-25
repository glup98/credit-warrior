'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useCreateExpense } from '@/hooks/queries/use-expenses';
import { queryKeys } from '@/lib/query-keys';
import { formatLocalDate } from '@/lib/formatters';
import { cn, mapPydanticErrorsToForm } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { expenseCreateSchema } from '@/schemas/expense.schema';
import type { ExpenseCreate } from '@/types/api.types';
import { CardSelectChips } from './card-select-chips';
import { QuickDatePicker } from './quick-date-picker';
import { InstallmentsSelector } from './installments-selector';
import { ExpenseSplitBuilder, type SplitItem, type SplitType } from './expense-split-builder';
import { Textarea } from '@/components/ui/textarea';

export interface FormExpenseValues {
  card_id: string;
  description: string;
  total_amount: string;
  purchase_date: string;
  installments_count: number | string;
  first_billing_override?: string | null;
  notes?: string | null;
  splits: SplitItem[];
}

export interface QuickExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  defaultValues?: Partial<FormExpenseValues>;
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Normaliza rigurosamente los datos del formulario antes de despacharlos al backend:
 * - Cadenas vacías o con solo espacios en first_billing_override y notes se transforman a null.
 * - En modo EQUAL, se purgan percentage y fixed_amount a null para cumplir extra="forbid".
 * - En modo PERCENTAGE, fixed_amount se establece en null.
 * - En modo FIXED_AMOUNT, percentage se establece en null.
 */
export function cleanExpensePayload(rawValues: FormExpenseValues): ExpenseCreate {
  const isOverrideEmpty =
    !rawValues.first_billing_override || rawValues.first_billing_override.trim() === '';
  const areNotesEmpty = !rawValues.notes || rawValues.notes.trim() === '';

  const cleanedSplits = rawValues.splits.map((split) => {
    if (split.split_type === 'EQUAL') {
      return {
        person_id: split.person_id,
        split_type: 'EQUAL' as const,
        percentage: null,
        fixed_amount: null,
      };
    }
    if (split.split_type === 'PERCENTAGE') {
      return {
        person_id: split.person_id,
        split_type: 'PERCENTAGE' as const,
        percentage: split.percentage ? split.percentage.trim() : null,
        fixed_amount: null,
      };
    }
    return {
      person_id: split.person_id,
      split_type: 'FIXED_AMOUNT' as const,
      percentage: null,
      fixed_amount: split.fixed_amount ? split.fixed_amount.trim() : null,
    };
  });

  return {
    card_id: rawValues.card_id,
    description: rawValues.description.trim(),
    total_amount: rawValues.total_amount.trim(),
    purchase_date: rawValues.purchase_date,
    installments_count: Number(rawValues.installments_count) || 1,
    first_billing_override: isOverrideEmpty ? null : rawValues.first_billing_override!.trim(),
    notes: areNotesEmpty ? null : rawValues.notes!.trim(),
    splits: cleanedSplits,
  };
}

/**
 * Formulario orquestador principal para registro ultra-rápido de compras y gastos.
 * Conecta selector de tarjetas con divisa reactiva, atajos de fecha y cuotas,
 * constructor interactivo de repartos y opciones avanzadas normalizadas.
 */
export function QuickExpenseForm({
  onSuccess,
  onCancel,
  className,
  defaultValues,
  onDirtyChange,
}: QuickExpenseFormProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateExpense();
  const { data: cards = [] } = useCards({ is_active: true });
  const { data: persons = [] } = usePersons({ is_active: true });

  const [splitType, setSplitType] = React.useState<SplitType>(
    defaultValues?.splits?.[0]?.split_type ?? 'EQUAL',
  );
  const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false);

  const form = useForm<FormExpenseValues>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: {
      card_id: defaultValues?.card_id ?? (cards.length === 1 ? cards[0].id : ''),
      description: defaultValues?.description ?? '',
      total_amount: defaultValues?.total_amount ?? '',
      purchase_date: defaultValues?.purchase_date ?? formatLocalDate(new Date()),
      installments_count: defaultValues?.installments_count ?? 1,
      first_billing_override: defaultValues?.first_billing_override ?? '',
      notes: defaultValues?.notes ?? '',
      splits:
        defaultValues?.splits ??
        (splitType === 'EQUAL' && persons.length > 0
          ? persons.map((p) => ({
              person_id: p.id,
              split_type: 'EQUAL' as const,
              percentage: null,
              fixed_amount: null,
            }))
          : []),
    },
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = form;

  // Auto-selección reactiva de tarjeta cuando hay una sola activa registrada
  React.useEffect(() => {
    const currentCard = form.getValues('card_id');
    if (cards.length === 1 && !currentCard) {
      setValue('card_id', cards[0].id, { shouldValidate: true });
    }
  }, [cards, setValue, form]);

  // Auto-preselección reactiva de todos los participantes activos en modo EQUAL
  React.useEffect(() => {
    const currentSplits = form.getValues('splits');
    if (splitType === 'EQUAL' && persons.length > 0 && currentSplits.length === 0) {
      setValue(
        'splits',
        persons.map((p) => ({
          person_id: p.id,
          split_type: 'EQUAL',
          percentage: null,
          fixed_amount: null,
        })),
        { shouldValidate: true },
      );
    }
  }, [persons, splitType, setValue, form]);

  const currentCardId = watch('card_id');
  const selectedCard = cards.find((c) => c.id === currentCardId);
  const currency = selectedCard?.currency ?? 'CLP';
  const totalAmountValue = watch('total_amount');
  const descriptionValue = watch('description');
  const splitsValue = watch('splits');

  React.useEffect(() => {
    const isDirty = Boolean(
      (descriptionValue && descriptionValue.trim().length > 0) ||
      (totalAmountValue && totalAmountValue.trim().length > 0),
    );
    onDirtyChange?.(isDirty);
  }, [descriptionValue, totalAmountValue, onDirtyChange]);

  const onSubmit = async (values: FormExpenseValues) => {
    try {
      const payload = cleanExpensePayload(values);
      await createMutation.mutateAsync(payload);
      toast.success('Gasto registrado exitosamente');
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 422 || err.isValidationError) {
          mapPydanticErrorsToForm(err, setError);
          return;
        }
        if (err.status === 404) {
          toast.error('La tarjeta o uno de los participantes seleccionados ya no existe');
          queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
          return;
        }
      }
      toast.error('Error de conexión con el servidor. Tus datos están a salvo; reintenta');
    }
  };

  const isSubmitting = createMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn('space-y-4 text-text-primary', className)}
    >
      {/* 1. Selector de Tarjetas Activas */}
      <Controller
        name="card_id"
        control={control}
        render={({ field }) => (
          <CardSelectChips
            value={field.value}
            onChange={(cardId) => {
              field.onChange(cardId);
            }}
            hasEnteredAmount={Boolean(totalAmountValue)}
            onResetAmounts={() => {
              setValue('total_amount', '');
              setValue(
                'splits',
                splitsValue.map((s) => ({ ...s, fixed_amount: null })),
              );
            }}
            error={Boolean(errors.card_id)}
            errorMessage={errors.card_id?.message}
          />
        )}
      />

      {/* 2. Concepto / Descripción */}
      <div className="space-y-1.5">
        <label
          htmlFor="expense-description"
          className="text-xs font-medium text-text-primary flex items-center justify-between"
        >
          <span>Descripción</span>
          <span className="text-[11px] text-text-muted">Requerido</span>
        </label>
        <input
          type="text"
          id="expense-description"
          {...register('description')}
          placeholder="Ej. Supermercado, Restaurant, Pasajes"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'expense-description-error' : undefined}
          className={cn(
            'flex h-10 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary',
            'transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp focus-visible:border-accent-clp',
            'disabled:cursor-not-allowed disabled:opacity-50',
            errors.description && 'border-accent-danger focus-visible:ring-accent-danger',
          )}
        />
        {errors.description && (
          <p
            id="expense-description-error"
            role="alert"
            className="text-xs text-accent-danger"
          >
            {errors.description.message}
          </p>
        )}
      </div>

      {/* 3. Monto Total */}
      <div className="space-y-1.5">
        <label
          htmlFor="expense-total-amount"
          className="text-xs font-medium text-text-primary flex items-center justify-between"
        >
          <span>Monto total</span>
          <span className="text-[11px] font-medium text-accent-clp">{currency}</span>
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-sm font-semibold text-text-muted">
            {currency === 'CLP' ? '$' : 'US$'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            id="expense-total-amount"
            {...register('total_amount')}
            placeholder={currency === 'CLP' ? '150000' : '99.50'}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.total_amount)}
            aria-describedby={errors.total_amount ? 'expense-total-amount-error' : undefined}
            className={cn(
              'flex h-10 w-full rounded-lg border border-border-subtle bg-surface text-sm font-medium text-text-primary',
              currency === 'CLP' ? 'pl-8 pr-3' : 'pl-11 pr-3',
              'transition-colors placeholder:text-text-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp focus-visible:border-accent-clp',
              'disabled:cursor-not-allowed disabled:opacity-50',
              errors.total_amount && 'border-accent-danger focus-visible:ring-accent-danger',
            )}
          />
        </div>
        {errors.total_amount && (
          <p
            id="expense-total-amount-error"
            role="alert"
            className="text-xs text-accent-danger"
          >
            {errors.total_amount.message}
          </p>
        )}
      </div>

      {/* 4. Fecha de Compra y Selector de Cuotas en cuadrícula */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="purchase_date"
          control={control}
          render={({ field }) => (
            <QuickDatePicker
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.purchase_date?.message}
            />
          )}
        />

        <Controller
          name="installments_count"
          control={control}
          render={({ field }) => (
            <InstallmentsSelector
              value={Number(field.value) || 1}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.installments_count?.message}
            />
          )}
        />
      </div>

      {/* 5. Acordeón de Opciones Avanzadas */}
      <div className="rounded-xl border border-border-subtle/70 bg-surface/30">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions((prev) => !prev)}
          aria-expanded={showAdvancedOptions}
          className="flex w-full items-center justify-between p-3 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-clp" />
            <span>Opciones avanzadas</span>
          </div>
          {showAdvancedOptions ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showAdvancedOptions && (
          <div className="space-y-3 border-t border-border-subtle/70 p-3 pt-3">
            {/* Diferimiento de Facturación */}
            <div className="space-y-1">
              <label
                htmlFor="expense-first-billing"
                className="text-xs font-medium text-text-primary"
              >
                Primer mes de facturación
              </label>
              <input
                type="text"
                id="expense-first-billing"
                {...register('first_billing_override')}
                placeholder="YYYY-MM (ej. 2026-12)"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.first_billing_override)}
                aria-describedby={
                  errors.first_billing_override ? 'expense-billing-error' : undefined
                }
                className={cn(
                  'flex h-9 w-full rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-text-primary',
                  'transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp focus-visible:border-accent-clp',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  errors.first_billing_override && 'border-accent-danger',
                )}
              />
              <p className="text-[11px] text-text-muted">
                Fuerza el mes de inicio del cobro si la compra tiene meses de gracia.
              </p>
              {errors.first_billing_override && (
                <p
                  id="expense-billing-error"
                  role="alert"
                  className="text-xs text-accent-danger"
                >
                  {errors.first_billing_override.message}
                </p>
              )}
            </div>

            {/* Notas opcionales */}
            <div className="space-y-1">
              <label htmlFor="expense-notes" className="text-xs font-medium text-text-primary">
                Notas
              </label>
              <Textarea
                id="expense-notes"
                {...register('notes')}
                rows={2}
                placeholder="Notas adicionales o acuerdos específicos..."
                disabled={isSubmitting}
                error={Boolean(errors.notes)}
              />
              {errors.notes && (
                <p role="alert" className="text-xs text-accent-danger">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Constructor de Repartos (ExpenseSplitBuilder) */}
      <Controller
        name="splits"
        control={control}
        render={({ field }) => (
          <ExpenseSplitBuilder
            splitType={splitType}
            onSplitTypeChange={setSplitType}
            splits={field.value}
            onSplitsChange={field.onChange}
            totalAmount={totalAmountValue}
            currency={currency}
            error={errors.splits?.message}
          />
        )}
      />

      {/* Alerta de error global de splits si existe */}
      {errors.splits && !errors.splits.message && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2.5 text-xs text-accent-danger"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Por favor verifica los porcentajes o montos asignados.</span>
        </div>
      )}

      {/* 7. Acciones del Formulario */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cn(
              'rounded-lg border border-border-subtle bg-elevated/40 px-4 py-2 text-sm font-medium text-text-primary transition-colors',
              'hover:bg-surface hover:border-border-subtle/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg bg-accent-clp px-5 py-2 text-sm font-semibold text-canvas transition-all shadow-sm',
            'hover:bg-accent-clp/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registrando...</span>
            </>
          ) : (
            <span>Registrar gasto</span>
          )}
        </button>
      </div>
    </form>
  );
}
