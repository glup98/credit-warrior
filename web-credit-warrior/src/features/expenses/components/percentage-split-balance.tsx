'use client';

import * as React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { toCents } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { SplitItem } from './expense-split-builder';

export interface PercentageSplitBalanceProps {
  splits: SplitItem[];
  onDistributeEqually?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Balanceador porcentual interactivo que calcula en centésimas enteras
 * la suma acumulada de splits, con barra de progreso reactiva y botón de auto-distribución.
 */
export function PercentageSplitBalance({
  splits,
  onDistributeEqually,
  className,
  disabled = false,
}: PercentageSplitBalanceProps) {
  // Cálculo exacto en centésimas enteras (100.00% = 10000)
  const sumPercentageCents = React.useMemo(() => {
    return splits.reduce((acc, s) => acc + toCents(s.percentage), 0);
  }, [splits]);

  const targetCents = 10000;
  const isBalanced = sumPercentageCents === targetCents;
  const isOver = sumPercentageCents > targetCents;

  const assignedPctStr = (sumPercentageCents / 100).toFixed(2);
  const remainingPctStr = Math.max(0, (targetCents - sumPercentageCents) / 100).toFixed(2);
  const excessPctStr = Math.max(0, (sumPercentageCents - targetCents) / 100).toFixed(2);

  const progressPercent = Math.min(100, Math.max(0, Math.round(sumPercentageCents / 100)));

  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-surface/50 p-3 space-y-2.5',
        isBalanced && 'border-accent-clp/40 bg-accent-clp/5',
        isOver && 'border-accent-danger/40 bg-accent-danger/5',
        !isBalanced && !isOver && 'border-accent-usd/30 bg-accent-usd/5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isBalanced ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-clp" />
              <span className="text-accent-clp">Balanceado: 100.00%</span>
            </>
          ) : isOver ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0 text-accent-danger" />
              <span className="text-accent-danger">
                Exceso: {assignedPctStr}% (+{excessPctStr}%)
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-accent-usd" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-accent-usd">
                  Asignado: {assignedPctStr}%
                </span>
                <span className="text-border-subtle">·</span>
                <span className="text-text-muted">
                  Falta: {remainingPctStr}%
                </span>
              </div>
            </>
          )}
        </div>

        {onDistributeEqually && (
          <button
            type="button"
            onClick={onDistributeEqually}
            disabled={disabled || splits.length === 0}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-elevated px-2.5 py-1 text-xs font-medium text-text-primary transition-all',
              'hover:bg-surface hover:text-accent-clp hover:border-accent-clp/40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <Sparkles className="h-3 w-3 text-accent-clp" />
            <span>Distribuir equitativo</span>
          </button>
        )}
      </div>

      {/* Barra de progreso interactiva */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated/80">
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={
            isBalanced
              ? 'Balanceado al 100%'
              : isOver
                ? `Exceso del ${assignedPctStr}%`
                : `Asignado ${assignedPctStr}%, falta ${remainingPctStr}%`
          }
          style={{ width: `${progressPercent}%` }}
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            isBalanced && 'bg-accent-clp',
            isOver && 'bg-accent-danger',
            !isBalanced && !isOver && 'bg-accent-usd',
          )}
        />
      </div>
    </div>
  );
}
