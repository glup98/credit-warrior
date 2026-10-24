'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useHealthCheck } from '@/hooks/queries/use-health';
import { useQuickExpense } from '@/features/expenses/context/quick-expense-context';

function getHeaderTitle(pathname: string): string {
  if (pathname === '/') {
    return 'Dashboard';
  }
  if (pathname === '/expenses' || pathname.startsWith('/expenses/')) {
    return 'Compras y Cuotas';
  }
  if (pathname === '/cards' || pathname.startsWith('/cards/')) {
    return 'Tarjetas de Crédito';
  }
  if (pathname === '/persons' || pathname.startsWith('/persons/')) {
    return 'Participantes';
  }
  return 'Credit Warrior';
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getHeaderTitle(pathname);
  const { data: healthData, isLoading, isError } = useHealthCheck();
  const { open } = useQuickExpense();

  const renderHealthBadge = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-accent-warning" />
          <span>Verificando...</span>
        </div>
      );
    }

    if (isError || healthData?.status !== 'ok') {
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-accent-danger/30 bg-accent-danger/10 px-2.5 py-1 text-xs text-accent-danger">
          <span className="h-2 w-2 rounded-full bg-accent-danger" />
          <span>Offline</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs text-text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-clp opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-clp" />
        </span>
        <span className="font-medium text-accent-clp">Online</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-canvas/80 px-4 backdrop-blur-md md:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-text-primary md:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {renderHealthBadge()}
        <button
          type="button"
          onClick={open}
          className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary transition-all hover:bg-elevated hover:border-accent-clp/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp shadow-xs"
        >
          <Plus className="h-3.5 w-3.5 text-accent-clp stroke-[2.5]" />
          <span>Registrar gasto</span>
        </button>
      </div>
    </header>
  );
}
