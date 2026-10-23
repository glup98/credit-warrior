import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-usd focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-elevated text-text-primary',
        secondary: 'border-transparent bg-surface text-text-muted',
        destructive: 'border-accent-danger/30 bg-accent-danger/20 text-accent-danger',
        outline: 'border-border-subtle text-text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
