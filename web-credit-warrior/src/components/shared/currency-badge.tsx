import React from 'react';
import { cn } from '@/lib/utils';
import type { CurrencyEnum } from '@/types/api.types';

export interface CurrencyBadgeProps {
  currency: CurrencyEnum;
  className?: string;
}

/**
 * Visual badge identifying billing currency with semantic accent styling.
 */
export function CurrencyBadge({ currency, className }: CurrencyBadgeProps) {
  const isClp = currency === 'CLP';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium border',
        isClp
          ? 'bg-accent-clp/15 text-accent-clp border-accent-clp/30'
          : 'bg-accent-usd/15 text-accent-usd border-accent-usd/30',
        className,
      )}
    >
      {currency}
    </span>
  );
}
