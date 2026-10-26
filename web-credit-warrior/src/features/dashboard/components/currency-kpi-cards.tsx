import * as React from 'react';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { formatCurrency, toCents } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ActiveInstallmentItem, CurrencyEnum } from '@/types/api.types';

export interface CurrencyKpiCardsProps {
  totalsByCurrency: Record<string, string>;
  activeInstallments: ActiveInstallmentItem[];
  className?: string;
}

interface SingleKpiCardProps {
  currency: CurrencyEnum;
  title: string;
  totalAmount: string;
  installmentsCount: number;
}

function SingleKpiCard({
  currency,
  title,
  totalAmount,
  installmentsCount,
}: SingleKpiCardProps) {
  const isClp = currency === 'CLP';
  const cents = toCents(totalAmount);
  const isZero = cents === 0;

  const formattedAmount = formatCurrency(totalAmount, currency);

  let statusText = '0 compromisos pendientes';
  if (installmentsCount === 1 && !isZero) {
    statusText = '1 cuota activa';
  } else if (installmentsCount > 1 && !isZero) {
    statusText = `${installmentsCount} cuotas activas`;
  }

  return (
    <div
      data-currency={currency}
      className={cn(
        'relative flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle shadow-xs transition-all duration-200',
        isClp
          ? 'border-l-4 border-l-accent-clp hover:border-r-accent-clp/20 hover:border-y-accent-clp/20'
          : 'border-l-4 border-l-accent-usd hover:border-r-accent-usd/20 hover:border-y-accent-usd/20',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs sm:text-sm font-medium text-text-muted">
          {title}
        </span>
        <CurrencyBadge currency={currency} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className={cn(
            'text-2xl sm:text-3xl font-mono tabular-nums tracking-tight font-bold',
            isZero ? 'text-text-muted font-normal' : 'text-text-primary',
          )}
        >
          {formattedAmount}
        </span>

        <p
          className={cn(
            'text-xs font-medium',
            isZero
              ? 'text-text-muted/80'
              : isClp
                ? 'text-accent-clp/90'
                : 'text-accent-usd/90',
          )}
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}

/**
 * Tarjetas de resumen financiero clave (KPIs) multimoneda para el período seleccionado.
 * Muestra el total a pagar y el volumen de cuotas activas para CLP y USD.
 */
export function CurrencyKpiCards({
  totalsByCurrency,
  activeInstallments,
  className,
}: CurrencyKpiCardsProps) {
  const clpTotal = totalsByCurrency?.CLP ?? '0';
  const usdTotal = totalsByCurrency?.USD ?? '0.00';

  const clpCount = (activeInstallments ?? []).filter(
    (item) => item.currency === 'CLP',
  ).length;

  const usdCount = (activeInstallments ?? []).filter(
    (item) => item.currency === 'USD',
  ).length;

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4',
        className,
      )}
    >
      <SingleKpiCard
        currency="CLP"
        title="Total a pagar CLP"
        totalAmount={clpTotal}
        installmentsCount={clpCount}
      />

      <SingleKpiCard
        currency="USD"
        title="Total a pagar USD"
        totalAmount={usdTotal}
        installmentsCount={usdCount}
      />
    </div>
  );
}
