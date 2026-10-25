'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { toCents, formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CurrencyEnum } from '@/types/api.types';
import type { SplitItem } from './expense-split-builder';

export interface FixedSplitBalanceProps {
  splits: SplitItem[];
  totalAmount?: string;
  currency?: CurrencyEnum;
  className?: string;
}

/**
 * Balanceador de monto fijo que calcula en centavos enteros el saldo
 * restante por asignar o monto excedido en comparación al totalAmount.
 */
export function FixedSplitBalance({
  splits,
  totalAmount,
  currency = 'CLP',
  className,
}: FixedSplitBalanceProps) {
  const totalCents = React.useMemo(() => {
    return totalAmount ? toCents(totalAmount) : 0;
  }, [totalAmount]);

  const assignedCents = React.useMemo(() => {
    return splits.reduce((acc, s) => acc + toCents(s.fixed_amount), 0);
  }, [splits]);

  const hasTotal = totalCents > 0;
  const remainingCents = totalCents - assignedCents;
  const isCovered = hasTotal && remainingCents === 0;
  const isOver = hasTotal && remainingCents < 0;
  const isPending = hasTotal && remainingCents > 0;

  const diffStr = React.useMemo(() => {
    const absDiffCents = Math.abs(remainingCents);
    const amountVal =
      currency === 'CLP'
        ? String(Math.floor(absDiffCents / 100))
        : (absDiffCents / 100).toFixed(2);
    return formatCurrency(amountVal, currency);
  }, [remainingCents, currency]);

  const progressPercent = hasTotal
    ? Math.min(100, Math.max(0, Math.round((assignedCents / totalCents) * 100)))
    : 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-surface/50 p-3 space-y-2.5',
        isCovered && 'border-accent-clp/40 bg-accent-clp/5',
        isOver && 'border-accent-danger/40 bg-accent-danger/5',
        isPending && 'border-accent-usd/30 bg-accent-usd/5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {!hasTotal ? (
            <>
              <HelpCircle className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="text-text-muted">
                Ingresa el monto total del gasto para calcular el restante
              </span>
            </>
          ) : isCovered ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-clp" />
              <span className="text-accent-clp">Total cubierto exactamente</span>
            </>
          ) : isOver ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0 text-accent-danger" />
              <span className="text-accent-danger">
                Monto excedido por: {diffStr}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-accent-usd" />
              <span className="text-accent-usd">
                Restante por asignar: {diffStr}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Barra de progreso interactiva */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated/80">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={
            !hasTotal
              ? 'Esperando monto total'
              : isCovered
                ? 'Total cubierto exactamente'
                : isOver
                  ? `Monto excedido por ${diffStr}`
                  : `Restante por asignar ${diffStr}`
          }
          style={{ width: `${progressPercent}%` }}
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            isCovered && 'bg-accent-clp',
            isOver && 'bg-accent-danger',
            isPending && 'bg-accent-usd',
            !hasTotal && 'bg-border-subtle',
          )}
        />
      </div>
    </div>
  );
}
