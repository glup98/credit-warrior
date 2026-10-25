'use client';

import * as React from 'react';
import { Check, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PRESET_COLORS = [
  '#10B981', // Verde Esmeralda
  '#38BDF8', // Azul Cielo
  '#8B5CF6', // Violeta Real
  '#F59E0B', // Ámbar Cálido
  '#F43F5E', // Rosa Carmín
  '#14B8A6', // Aguamarina
  '#FB923C', // Naranja Fuego
  '#6366F1', // Azul Índigo
] as const;

export interface ColorPickerProps {
  value?: string | null;
  onChange: (colorHex: string | null) => void;
  className?: string;
  id?: string;
}

/**
 * Selector cromático accesible con 8 colores de alto contraste Obsidian Ink y opción neutra explícita (null).
 */
export function ColorPicker({
  value,
  onChange,
  className,
  id,
}: ColorPickerProps) {
  const isNeutral = !value || value.trim() === '';

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Selector de color de participante"
      className={cn('flex flex-wrap items-center gap-2.5', className)}
    >
      {/* 8 Colores Predefinidos */}
      {PRESET_COLORS.map((color) => {
        const isSelected = !isNeutral && value?.toLowerCase() === color.toLowerCase();

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={cn(
              'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-transform',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              isSelected
                ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-canvas shadow-md'
                : 'opacity-85 hover:opacity-100 hover:scale-105',
            )}
          >
            {isSelected && (
              <Check className="h-5 w-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
            )}
          </button>
        );
      })}

      {/* Opción Neutra Explícita (color_hex: null) */}
      <button
        type="button"
        role="radio"
        aria-checked={isNeutral}
        aria-label="Neutro (sin color)"
        onClick={() => onChange(null)}
        className={cn(
          'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          isNeutral
            ? 'border-white bg-elevated text-text-primary ring-2 ring-white ring-offset-2 ring-offset-canvas shadow-md scale-105'
            : 'border-dashed border-border-subtle bg-canvas text-text-muted hover:border-text-muted hover:text-text-primary hover:scale-105',
        )}
      >
        {isNeutral ? (
          <Check className="h-5 w-5 text-text-primary" />
        ) : (
          <Ban className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
