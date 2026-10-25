'use client';

import * as React from 'react';
import { useQuickExpense } from '@/features/expenses/context/quick-expense-context';

export interface UseQuickExpenseKeyboardOptions {
  onTrigger?: () => void;
  enabled?: boolean;
}

/**
 * Hook que escucha el evento keydown en window para los atajos 'N' o 'Alt+N'.
 * Aplica una regla estricta de exclusión de foco: no se activa si el elemento enfocado
 * es un input, textarea, select o tiene contenido editable (isContentEditable).
 */
export function useQuickExpenseKeyboard(options?: UseQuickExpenseKeyboardOptions) {
  const { onTrigger, enabled = true } = options ?? {};

  // Intentamos obtener el contexto si no se proveyó un trigger externo explícito
  let contextOpen: (() => void) | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useQuickExpense();
    contextOpen = context.open;
  } catch {
    // Si se utiliza fuera del provider con un trigger explícito en pruebas
    contextOpen = undefined;
  }

  const handleTrigger = onTrigger ?? contextOpen;

  React.useEffect(() => {
    if (!enabled || !handleTrigger) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si se presiona Ctrl o Meta (Command)
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      // Validar si la tecla es N / n
      const isKeyN = event.key === 'n' || event.key === 'N';
      if (!isKeyN) {
        return;
      }

      // Exclusión estricta de foco: verificar si el target o el activeElement es editable
      const target = event.target as HTMLElement | null;
      const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

      const isElementEditable = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        const tagName = el.tagName?.toUpperCase();
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
          return true;
        }
        if (el.isContentEditable) {
          return true;
        }
        const ceAttr = el.getAttribute?.('contenteditable');
        if (ceAttr === 'true' || ceAttr === '') {
          return true;
        }
        if (el.closest?.('[contenteditable="true"], [contenteditable=""]')) {
          return true;
        }
        return false;
      };

      if (isElementEditable(target) || isElementEditable(activeEl)) {
        return;
      }

      // Prevenir acción por defecto si fuera necesario y disparar apertura
      event.preventDefault();
      handleTrigger();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleTrigger]);
}
