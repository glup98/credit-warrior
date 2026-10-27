'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatLocalDate } from '@/lib/formatters';
import {
  parseIsoToDisplay,
  parseDisplayToIso,
  formatDateMask,
  normalizePastedDate,
} from '@/lib/date-format';
import { cn } from '@/lib/utils';

export interface QuickDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Selector de fecha ergonómico localizado en formato visual DD/MM/AAAA (Spec 008 T2 + T3).
 * - Entrada de texto con teclado numérico en móvil (inputMode="numeric").
 * - Máscara dinámica en tiempo real que inserta barras "/" automáticamente.
 * - Sincronización transparente con el contrato ISO (YYYY-MM-DD).
 * - Atajos táctiles "Hoy" y "Ayer" en hora local (sin desfases UTC).
 * - Selector gráfico de calendario accesible mediante showPicker() en input auxiliar.
 * - Validación estricta de calendario civil al perder el foco (onBlur).
 */
export function QuickDatePicker({
  value,
  onChange,
  label = 'Fecha de compra',
  id,
  name,
  className,
  error,
  disabled = false,
}: QuickDatePickerProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  // Referencia al input nativo oculto para showPicker()
  const hiddenDateInputRef = React.useRef<HTMLInputElement | null>(null);

  // Estado visual formateado en DD/MM/AAAA
  const [displayValue, setDisplayValue] = React.useState<string>(() =>
    parseIsoToDisplay(value),
  );
  // Error de validación local (en desenfoque)
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Sincronización reactiva cuando la prop value (ISO) cambia externamente
  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setDisplayValue(parseIsoToDisplay(value));
      if (value) {
        setLocalError(null);
      }
    }
  }, [value]);

  // Atajos rápidos "Hoy" y "Ayer" calculados en hora civil local
  const todayIso = React.useMemo(() => formatLocalDate(new Date()), []);
  const yesterdayIso = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
  }, []);

  const isToday = value === todayIso;
  const isYesterday = value === yesterdayIso;

  const handleShortcutClick = (targetIso: string) => {
    setDisplayValue(parseIsoToDisplay(targetIso));
    setLocalError(null);
    onChange(targetIso);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = formatDateMask(e.target.value, displayValue);
    setDisplayValue(nextVal);

    if (nextVal.length === 10) {
      const isoDate = parseDisplayToIso(nextVal);
      if (isoDate) {
        setLocalError(null);
        onChange(isoDate);
      }
    } else if (localError) {
      setLocalError(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const normalized = normalizePastedDate(pastedText);
    if (normalized) {
      e.preventDefault();
      setDisplayValue(normalized);
      const isoDate = parseDisplayToIso(normalized);
      if (isoDate) {
        setLocalError(null);
        onChange(isoDate);
      }
    }
  };

  const handleBlur = () => {
    const trimmed = displayValue.trim();
    if (!trimmed) {
      setLocalError(null);
      return;
    }

    if (trimmed.length < 10) {
      setLocalError('Fecha incompleta o inválida. Usa el formato DD/MM/AAAA.');
      return;
    }

    const isoDate = parseDisplayToIso(trimmed);
    if (!isoDate) {
      setLocalError('Fecha inexistente en el calendario civil.');
      return;
    }

    setLocalError(null);
  };

  const handleOpenCalendar = () => {
    if (disabled) return;
    const hiddenInput = hiddenDateInputRef.current;
    if (!hiddenInput) return;

    if (typeof hiddenInput.showPicker === 'function') {
      try {
        hiddenInput.showPicker();
      } catch {
        hiddenInput.focus();
        hiddenInput.click();
      }
    } else {
      hiddenInput.focus();
      hiddenInput.click();
    }
  };

  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    if (newIso) {
      setDisplayValue(parseIsoToDisplay(newIso));
      setLocalError(null);
      onChange(newIso);
    }
  };

  const currentError = error || localError;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-primary flex items-center gap-1.5 cursor-pointer"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span>{label}</span>
        </label>

        {/* Atajos táctiles rápidos: Hoy y Ayer */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={isToday}
            disabled={disabled}
            onClick={() => handleShortcutClick(todayIso)}
            className={cn(
              'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
              isToday
                ? 'border-accent-clp bg-accent-clp/15 text-accent-clp font-semibold shadow-xs'
                : 'border-border-subtle bg-elevated/40 text-text-muted hover:text-text-primary hover:border-border-subtle/80',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            Hoy
          </button>
          <button
            type="button"
            aria-pressed={isYesterday}
            disabled={disabled}
            onClick={() => handleShortcutClick(yesterdayIso)}
            className={cn(
              'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
              isYesterday
                ? 'border-accent-clp bg-accent-clp/15 text-accent-clp font-semibold shadow-xs'
                : 'border-border-subtle bg-elevated/40 text-text-muted hover:text-text-primary hover:border-border-subtle/80',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            Ayer
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          id={inputId}
          name={name}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          value={displayValue}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          disabled={disabled}
          aria-invalid={Boolean(currentError)}
          aria-describedby={currentError ? `${inputId}-error` : undefined}
          className={cn(
            'flex h-10 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 pr-11 text-sm text-text-primary tabular-nums',
            'transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp focus-visible:border-accent-clp',
            'disabled:cursor-not-allowed disabled:opacity-50',
            currentError && 'border-accent-danger focus-visible:ring-accent-danger',
          )}
        />

        {/* Botón interactivo de selector gráfico de calendario */}
        <button
          type="button"
          aria-label="Abrir calendario"
          disabled={disabled}
          onClick={handleOpenCalendar}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-muted transition-colors',
            'hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
        </button>

        {/* Input auxiliar invisible de fecha para activar showPicker() */}
        <input
          type="date"
          ref={hiddenDateInputRef}
          tabIndex={-1}
          aria-hidden="true"
          value={value || ''}
          onChange={handleHiddenDateChange}
          disabled={disabled}
          className="sr-only"
        />
      </div>

      {currentError && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-accent-danger">
          {currentError}
        </p>
      )}
    </div>
  );
}
