import React from 'react';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CurrencyEnum } from '@/types/api.types';

export interface MoneyDisplayProps {
  amount: string | null | undefined;
  currency: CurrencyEnum;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<NonNullable<MoneyDisplayProps['size']>, string> = {
  sm: 'text-xs font-normal',
  md: 'text-sm font-medium',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
};

/**
 * Visual primitive for financial amounts.
 * Enforces tabular monospace alignment and semantic currency accents.
 */
export function MoneyDisplay({
  amount,
  currency,
  size = 'md',
  className,
}: MoneyDisplayProps) {
  const formatted = formatCurrency(amount, currency);
  const colorClass = currency === 'CLP' ? 'text-accent-clp' : 'text-accent-usd';

  return (
    <span
      className={cn(
        'font-mono tabular-nums tracking-tight',
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      {formatted}
    </span>
  );
}
