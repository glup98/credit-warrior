import React from 'react';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  totalSteps?: number;
  className?: string;
}

const STEP_NAMES: Record<1 | 2 | 3, string> = {
  1: 'Bienvenida',
  2: 'Primera Tarjeta',
  3: 'Participantes',
};

export function StepIndicator({
  currentStep,
  totalSteps = 3,
  className,
}: StepIndicatorProps) {
  const stepName = STEP_NAMES[currentStep] ?? 'Configuración';

  return (
    <div className={cn('w-full max-w-md space-y-2', className)}>
      <div className="flex items-center justify-between text-xs font-medium text-text-muted">
        <span>
          Paso {currentStep} de {totalSteps}: {stepName}
        </span>
        <span className="font-mono text-[11px] text-text-muted">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>

      <div className="flex gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          return (
            <div
              key={stepNumber}
              data-step-segment={stepNumber}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isActive ? 'bg-accent-clp' : 'bg-elevated border border-border-subtle',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
