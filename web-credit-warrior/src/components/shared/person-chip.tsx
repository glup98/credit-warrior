import React from 'react';
import { cn } from '@/lib/utils';

export interface PersonChipProps {
  name: string;
  colorHex?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Visual chip representing a participant person with custom color dot and safe truncation.
 */
export function PersonChip({
  name,
  colorHex,
  size = 'md',
  className,
}: PersonChipProps) {
  const fallbackColor = '#8A93A6';
  const effectiveColor = colorHex?.trim() ? colorHex : fallbackColor;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-elevated/50 text-text-primary font-medium shadow-xs',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm',
        className,
      )}
      title={name}
    >
      <span
        data-testid="color-dot"
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: effectiveColor }}
        aria-hidden="true"
      />
      <span className="truncate max-w-[120px] md:max-w-[160px]">{name}</span>
    </span>
  );
}
