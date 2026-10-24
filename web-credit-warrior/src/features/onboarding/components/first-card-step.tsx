import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, HelpCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cardCreateSchema } from '@/schemas/card.schema';
import { useCreateCard } from '@/hooks/queries/use-cards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { formatMaskedCard } from '@/lib/formatters';
import { mapPydanticErrorsToForm, cn } from '@/lib/utils';
import type { CardRead, CurrencyEnum } from '@/types/api.types';
import type { z } from 'zod';

type CardFormValues = z.infer<typeof cardCreateSchema>;

export interface FirstCardStepProps {
  onSuccess: (card: CardRead) => void;
  createdCard?: CardRead | null;
  onContinueToStep3?: () => void;
}

export function FirstCardStep({
  onSuccess,
  createdCard,
  onContinueToStep3,
}: FirstCardStepProps) {
  const createCardMutation = useCreateCard();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardCreateSchema),
    defaultValues: {
      name: '',
      last_four_digits: null,
      currency: 'CLP',
      default_monthly_fee: '0',
      closing_day: undefined,
      due_day: undefined,
      is_active: true,
    },
  });

  const selectedCurrency = watch('currency') as CurrencyEnum;

  const onSubmit = async (values: CardFormValues) => {
    try {
      const payload = {
        ...values,
        last_four_digits: values.last_four_digits?.trim()
          ? values.last_four_digits.trim()
          : null,
        default_monthly_fee: values.default_monthly_fee?.trim()
          ? values.default_monthly_fee.trim()
          : '0',
      };

      const card = await createCardMutation.mutateAsync(payload);
      toast.success('Tarjeta creada exitosamente');
      onSuccess(card);
    } catch (err: unknown) {
      const handled = mapPydanticErrorsToForm(err, setError);
      if (!handled) {
        toast.error('No fue posible crear la tarjeta. Revisa tu conexión.');
      }
    }
  };

  // Modo Lectura / Revisión
  if (createdCard) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-clp/30 bg-accent-clp/10 text-accent-clp">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Tarjeta Registrada
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Revisión de los datos de la primera tarjeta creada para este entorno.
        </p>

        {/* Card visual de resumen */}
        <div className="mt-8 w-full rounded-2xl border border-border-subtle bg-surface p-6 text-left shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-elevated text-accent-clp">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{createdCard.name}</h3>
                {createdCard.last_four_digits && (
                  <p className="font-mono text-xs text-text-muted">
                    {formatMaskedCard(createdCard.last_four_digits)}
                  </p>
                )}
              </div>
            </div>
            <CurrencyBadge currency={createdCard.currency} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-border-subtle bg-elevated/40 p-4 text-xs">
            <div>
              <span className="text-text-muted block">Facturación</span>
              <span className="mt-1 font-semibold text-text-primary">
                Día de corte: {createdCard.closing_day}
              </span>
            </div>
            <div>
              <span className="text-text-muted block">Vencimiento</span>
              <span className="mt-1 font-semibold text-text-primary">
                Día de pago: {createdCard.due_day}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 w-full">
          <Button
            type="button"
            onClick={onContinueToStep3}
            className="w-full justify-center gap-2 bg-accent-clp py-5 text-base font-semibold text-canvas hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
          >
            <span>Continuar a Participantes</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Modo Formulario de Creación
  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Registra tu Primera Tarjeta
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Ingresa la tarjeta que utilizas para tus compras compartidas y sus días de ciclo.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
        {/* Nombre de la Tarjeta */}
        <div className="space-y-2">
          <Label htmlFor="card-name">Nombre de la tarjeta</Label>
          <Input
            id="card-name"
            placeholder="Ej. Visa Santander, CMR Falabella"
            error={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name?.message && (
            <p className="text-xs text-accent-danger">{errors.name.message}</p>
          )}
        </div>

        {/* Moneda y Últimos 4 Dígitos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Selector de Moneda */}
          <div className="space-y-2">
            <Label>Moneda de facturación</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue('currency', 'CLP', { shouldValidate: true })}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                  selectedCurrency === 'CLP'
                    ? 'border-accent-clp bg-accent-clp/10 text-accent-clp'
                    : 'border-border-subtle bg-elevated text-text-muted hover:text-text-primary',
                )}
              >
                <span>CLP ($)</span>
              </button>
              <button
                type="button"
                onClick={() => setValue('currency', 'USD', { shouldValidate: true })}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-usd',
                  selectedCurrency === 'USD'
                    ? 'border-accent-usd bg-accent-usd/10 text-accent-usd'
                    : 'border-border-subtle bg-elevated text-text-muted hover:text-text-primary',
                )}
              >
                <span>USD (US$)</span>
              </button>
            </div>
          </div>

          {/* Últimos 4 Dígitos */}
          <div className="space-y-2">
            <Label htmlFor="card-last-four">Últimos 4 dígitos (opcional)</Label>
            <Input
              id="card-last-four"
              placeholder="1234"
              maxLength={4}
              error={Boolean(errors.last_four_digits)}
              {...register('last_four_digits', {
                setValueAs: (v) =>
                  typeof v === 'string' && v.trim() === '' ? null : v,
              })}
            />
            {errors.last_four_digits?.message && (
              <p className="text-xs text-accent-danger">
                {errors.last_four_digits.message}
              </p>
            )}
          </div>
        </div>

        {/* Mantención mensual base */}
        <div className="space-y-2">
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
          {errors.default_monthly_fee?.message && (
            <p className="text-xs text-accent-danger">
              {errors.default_monthly_fee.message}
            </p>
          )}
        </div>

        {/* Días de Facturación (Corte) y Vencimiento (Pago) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="card-closing-day">Día de corte</Label>
            <Input
              id="card-closing-day"
              type="number"
              min={1}
              max={31}
              placeholder="Ej. 20"
              error={Boolean(errors.closing_day)}
              {...register('closing_day', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
            />
            {errors.closing_day?.message && (
              <p className="text-xs text-accent-danger">
                {errors.closing_day.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-due-day">Día de pago</Label>
            <Input
              id="card-due-day"
              type="number"
              min={1}
              max={31}
              placeholder="Ej. 5"
              error={Boolean(errors.due_day)}
              {...register('due_day', {
                setValueAs: (v) => (v === '' ? undefined : Number(v)),
              })}
            />
            {errors.due_day?.message && (
              <p className="text-xs text-accent-danger">{errors.due_day.message}</p>
            )}
          </div>
        </div>

        {/* Cápsula Explicativa Financiera */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 text-xs leading-relaxed text-text-muted space-y-2">
          <div className="flex items-center gap-2 font-medium text-text-primary">
            <HelpCircle className="h-4 w-4 text-accent-clp" />
            <span>¿Por qué son importantes estas fechas?</span>
          </div>
          <p>
            <strong className="text-text-primary">Día de corte:</strong> Día del mes en que el banco emite el estado de cuenta cerrando el período de compras.
          </p>
          <p>
            <strong className="text-text-primary">Día de pago:</strong> Fecha límite mensual en que se debe pagar la cuota facturada.
          </p>
        </div>

        {/* Botón de Envío */}
        <Button
          type="submit"
          disabled={createCardMutation.isPending}
          className="w-full justify-center gap-2 bg-accent-clp py-5 text-base font-semibold text-canvas hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
        >
          {createCardMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Guardando tarjeta...</span>
            </>
          ) : (
            <>
              <span>Guardar tarjeta y continuar</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
