import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const isInvalid = Boolean(
      error || props['aria-invalid'] === true || props['aria-invalid'] === 'true',
    );

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid
            ? 'border-accent-danger focus-visible:ring-accent-danger'
            : 'border-border-subtle focus-visible:ring-accent-clp',
          className,
        )}
        ref={ref}
        aria-invalid={isInvalid ? 'true' : props['aria-invalid']}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
