import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Empty state visual container directing user action in zero-data states.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-subtle bg-surface p-8 flex flex-col items-center justify-center text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3.5 flex items-center justify-center rounded-full border border-border-subtle bg-elevated/60 p-3 text-text-muted">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-text-muted max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
