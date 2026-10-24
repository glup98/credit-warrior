'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Receipt, CreditCard, Users, Plus } from 'lucide-react';
import { useQuickExpense } from '@/features/expenses/context/quick-expense-context';
import { prefetchNavigationTarget } from '@/lib/prefetch';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Compras', icon: Receipt },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  { href: '/cards', label: 'Tarjetas', icon: CreditCard },
  { href: '/persons', label: 'Personas', icon: Users },
];

/**
 * Barra de navegación inferior móvil para dispositivos de pantalla reducida (< 768px).
 * Incorpora activación optimista inmediata (0ms), precarga proactiva en touch/hover
 * y prefetch declarativo de Next.js.
 */
export function BottomNav() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { open } = useQuickExpense();

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

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS_LEFT.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onTouchStart={() => handleLinkInteraction(item.href)}
              onMouseEnter={() => handleLinkInteraction(item.href)}
              onClick={() => handleLinkClick(item.href)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                active
                  ? 'font-medium text-accent-clp'
                  : 'text-text-muted hover:text-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Botón Central Prominente + */}
        <div className="relative -top-3 flex flex-col items-center justify-center px-1">
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label="Registrar nueva compra compartida"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-clp text-canvas shadow-lg transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {NAV_ITEMS_RIGHT.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onTouchStart={() => handleLinkInteraction(item.href)}
              onMouseEnter={() => handleLinkInteraction(item.href)}
              onClick={() => handleLinkClick(item.href)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                active
                  ? 'font-medium text-accent-clp'
                  : 'text-text-muted hover:text-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
