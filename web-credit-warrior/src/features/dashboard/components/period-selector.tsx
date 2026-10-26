'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPeriod } from '@/lib/formatters';
import { getNextPeriod, getPreviousPeriod, isValidPeriod } from '@/lib/date-period';
import { cn } from '@/lib/utils';

export interface PeriodSelectorProps {
  currentPeriod: string;
  defaultPeriod?: string | null;
  onPeriodChange: (nextPeriod: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Control accesible de navegación temporal por períodos mensuales (YYYY-MM).
 * Implementa navegación determinista con desbordamientos anuales y atajo
 * al período predeterminado ("Próximo vencimiento").
 */
export function PeriodSelector({
  currentPeriod,
  defaultPeriod,
  onPeriodChange,
  className,
  disabled = false,
}: PeriodSelectorProps) {
  const isPeriodValid = isValidPeriod(currentPeriod);
  const formattedPeriod = isPeriodValid ? formatPeriod(currentPeriod, 'full') : currentPeriod;

  const showShortcut = Boolean(
    defaultPeriod &&
      isValidPeriod(defaultPeriod) &&
      currentPeriod !== defaultPeriod,
  );

  const handlePrevious = () => {
    if (disabled || !isPeriodValid) return;
    try {
      const prev = getPreviousPeriod(currentPeriod);
      onPeriodChange(prev);
    } catch {
      // Manejo silencioso ante valores no deterministas
    }
  };

  const handleNext = () => {
    if (disabled || !isPeriodValid) return;
    try {
      const next = getNextPeriod(currentPeriod);
      onPeriodChange(next);
    } catch {
      // Manejo silencioso ante valores no deterministas
    }
  };

  const handleResetToDefault = () => {
    if (disabled || !defaultPeriod) return;
    onPeriodChange(defaultPeriod);
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 p-2 sm:p-2.5 rounded-xl bg-surface border border-border-subtle shadow-xs',
        className,
      )}
    >
      <div className="flex items-center justify-between w-full sm:w-auto gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Período anterior"
          disabled={disabled}
          onClick={handlePrevious}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 sm:flex-none flex items-center justify-center min-w-[160px] sm:min-w-[180px] px-2 select-none text-center">
          <span className="text-base sm:text-lg font-semibold text-text-primary capitalize tracking-tight">
            {formattedPeriod}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Período siguiente"
          disabled={disabled}
          onClick={handleNext}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {showShortcut && defaultPeriod && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={handleResetToDefault}
          className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3 gap-1.5 text-xs font-medium text-accent-usd border-accent-usd/30 hover:bg-accent-usd/10 hover:border-accent-usd/50 transition-colors w-full sm:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Próximo vencimiento</span>
        </Button>
      )}
    </div>
  );
}
