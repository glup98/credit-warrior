'use client';

import * as React from 'react';

export interface QuickExpenseContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const QuickExpenseContext = React.createContext<QuickExpenseContextValue | null>(null);

export interface QuickExpenseProviderProps {
  children: React.ReactNode;
}

/**
 * Proveedor de contexto global para orquestar la apertura/cierre de QuickExpenseDrawer
 * desde cualquier punto del shell (BottomNav, DesktopSidebar, AppHeader, atajos de teclado).
 */
export function QuickExpenseProvider({ children }: QuickExpenseProviderProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = React.useMemo<QuickExpenseContextValue>(
    () => ({
      isOpen,
      open,
      close,
      setIsOpen,
    }),
    [isOpen, open, close],
  );

  return (
    <QuickExpenseContext.Provider value={value}>
      {children}
    </QuickExpenseContext.Provider>
  );
}

/**
 * Hook para consumir el estado y disparadores de apertura/cierre de QuickExpenseDrawer.
 */
export function useQuickExpense(): QuickExpenseContextValue {
  const context = React.useContext(QuickExpenseContext);
  if (!context) {
    throw new Error('useQuickExpense must be used within a QuickExpenseProvider');
  }
  return context;
}
