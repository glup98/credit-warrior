'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Users,
  Plus,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useQuickExpense } from '@/features/expenses/context/quick-expense-context';
import { useHealthCheck } from '@/hooks/queries/use-health';
import { prefetchNavigationTarget } from '@/lib/prefetch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Compras', icon: Receipt },
  { href: '/cards', label: 'Tarjetas', icon: CreditCard },
  { href: '/persons', label: 'Personas', icon: Users },
];

/**
 * Barra lateral de navegación para pantallas de escritorio (>= 768px).
 * Cuenta con activación optimista instantánea (0ms), precarga proactiva en hover/focus
 * y sincronización con el estado de salud del backend.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { open } = useQuickExpense();
  const { data: healthData, isLoading: isHealthLoading, isError: isHealthError } = useHealthCheck();

  // Estado optimista de navegación pendiente
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const prevPathnameRef = React.useRef(pathname);

  // Reconciliación al cambiar de ruta
  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setPendingHref(null);
    }
  }, [pathname]);

  // Temporizador de seguridad ante cancelaciones de navegación
  React.useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => {
      setPendingHref(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  const effectivePath = pendingHref ?? pathname;

  const isItemActive = (href: string) => {
    if (href === '/') {
      return effectivePath === '/';
    }
    return effectivePath === href || effectivePath.startsWith(href + '/');
  };

  const handleLinkInteraction = (href: string) => {
    prefetchNavigationTarget(href, queryClient);
  };

  const handleLinkClick = (href: string) => {
    if (pathname !== href) {
      setPendingHref(href);
    }
  };

  const handleQuickAdd = () => {
    open();
  };

  const renderHealthStatus = () => {
    if (isHealthLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="h-2 w-2 rounded-full bg-accent-warning" />
          </span>
          <span>Verificando...</span>
        </div>
      );
    }

    if (isHealthError || healthData?.status !== 'ok') {
      return (
        <div className="flex items-center gap-2 text-xs text-accent-danger">
          <span className="h-2 w-2 rounded-full bg-accent-danger" />
          <span>Offline</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-clp opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-clp" />
        </span>
        <span className="text-accent-clp font-medium">Online</span>
      </div>
    );
  };

  return (
    <aside
      aria-label="Barra lateral principal"
      className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col border-r border-border-subtle bg-surface"
    >
      {/* Header: Marca e Isotipo */}
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-elevated text-accent-clp">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-semibold tracking-tight text-text-primary">
              Credit Warrior
            </span>
          </div>
        </div>
        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted border border-border-subtle">
          v0.1.0
        </span>
      </div>

      {/* Acción Primaria: Registrar Gasto */}
      <div className="p-4">
        <Button
          type="button"
          onClick={handleQuickAdd}
          className="w-full justify-center gap-2 bg-accent-clp text-canvas font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Registrar gasto</span>
        </Button>
      </div>

      {/* Menú de Navegación Vertical */}
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => handleLinkInteraction(item.href)}
              onFocus={() => handleLinkInteraction(item.href)}
              onClick={() => handleLinkClick(item.href)}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                active
                  ? 'border-l-2 border-accent-clp bg-elevated font-medium text-accent-clp'
                  : 'text-text-muted hover:bg-elevated/50 hover:text-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  active ? 'text-accent-clp' : 'text-text-muted group-hover:text-text-primary',
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Monitor de Salud del Backend */}
      <div className="border-t border-border-subtle p-4">
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-elevated/40 p-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">Servidor</span>
          </div>
          {renderHealthStatus()}
        </div>
      </div>
    </aside>
  );
}
