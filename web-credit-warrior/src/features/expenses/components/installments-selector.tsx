'use client';

import * as React from 'react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InstallmentsSelectorProps {
  value: number;
  onChange: (installments: number) => void;
  label?: string;
  id?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

const QUICK_INSTALLMENTS = [
  { value: 1, label: '1 (Contado)' },
  { value: 3, label: '3' },
  { value: 6, label: '6' },
  { value: 12, label: '12' },
] as const;

/**
 * Selector segmentado de cuotas de compra con atajos táctiles para 1, 3, 6, 12 cuotas
 * y campo numérico para ingreso manual de 1 a 120 cuotas.
 */
export function InstallmentsSelector({
  value,
  onChange,
  label = 'Cuotas',
  id,
  className,
  error,
  disabled = false,
}: InstallmentsSelectorProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onChange(1);
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-primary flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] text-text-muted">
          {value === 1 ? 'Al contado' : `${value} cuotas`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Atajos táctiles segmentados (1, 3, 6, 12) */}
        <div
          role="group"
          aria-label="Atajos de cuotas"
          className="flex flex-1 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface/50 p-1"
        >
          {QUICK_INSTALLMENTS.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-all text-center',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                  isSelected
                    ? 'border border-accent-clp/40 bg-accent-clp/15 text-accent-clp font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-elevated/40 border border-transparent',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Entrada numérica manual */}
        <div className="w-20 shrink-0">
          <input
            type="number"
            id={inputId}
            min={1}
            max={120}
            step={1}
            aria-label="Cuotas manual"
            value={value}
            onChange={handleManualChange}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'flex h-10 w-full rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-center text-xs font-semibold text-text-primary',
              'transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp focus-visible:border-accent-clp',
              'disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0',
              error && 'border-accent-danger focus-visible:ring-accent-danger',
            )}
          />
        </div>
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-accent-danger">
          {error}
        </p>
      )}
    </div>
  );
}
