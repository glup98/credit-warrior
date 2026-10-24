import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './bottom-nav';
import { usePathname } from 'next/navigation';
import { prefetchNavigationTarget } from '@/lib/prefetch';

const mockOpen = vi.fn();
vi.mock('@/features/expenses/context/quick-expense-context', () => ({
  useQuickExpense: () => ({
    isOpen: false,
    open: mockOpen,
    close: vi.fn(),
    setIsOpen: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('@/lib/prefetch', () => ({
  prefetchNavigationTarget: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('BottomNav Component (Spec 007 T4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('1. Renderiza los 4 enlaces de navegación y el botón central +', () => {
    render(<BottomNav />, { wrapper: createWrapper() });

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /compras/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tarjetas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /personas/i })).toBeInTheDocument();
  });

  it('2. Dispara prefetchNavigationTarget en onTouchStart y onMouseEnter sobre los enlaces', () => {
    render(<BottomNav />, { wrapper: createWrapper() });

    const expensesLink = screen.getByRole('link', { name: /compras/i });

    // onTouchStart táctil móvil
    fireEvent.touchStart(expensesLink);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/expenses', expect.any(Object));

    // onMouseEnter puntero desktop/tablet
    const cardsLink = screen.getByRole('link', { name: /tarjetas/i });
    fireEvent.mouseEnter(cardsLink);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/cards', expect.any(Object));
  });

  it('3. Activa optimista e inmediatamente (0ms) el enlace seleccionado antes de que cambie la URL', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(<BottomNav />, { wrapper: createWrapper() });

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    const cardsLink = screen.getByRole('link', { name: /tarjetas/i });

    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(cardsLink).not.toHaveAttribute('aria-current', 'page');

    // Clic en Tarjetas
    cardsLink.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(cardsLink);

    // Activación optimista inmediata a 0ms (pathname sigue siendo '/')
    expect(cardsLink).toHaveAttribute('aria-current', 'page');
    expect(cardsLink.className).toContain('text-accent-clp');
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('4. Reconcilia el estado optimista cuando pathname cambia a la nueva ruta', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    const { rerender } = render(<BottomNav />, { wrapper: createWrapper() });

    const cardsLink = screen.getByRole('link', { name: /tarjetas/i });
    cardsLink.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(cardsLink);

    expect(cardsLink).toHaveAttribute('aria-current', 'page');

    // Simula que la navegación se completó y Next.js actualiza pathname
    vi.mocked(usePathname).mockReturnValue('/cards');
    rerender(<BottomNav />);

    expect(cardsLink).toHaveAttribute('aria-current', 'page');
    expect(cardsLink.className).toContain('text-accent-clp');
  });

  it('5. Invoca el drawer de registro rápido al pulsar el botón central +', async () => {
    const user = userEvent.setup();
    render(<BottomNav />, { wrapper: createWrapper() });

    const plusBtn = screen.getByRole('button', { name: /registrar/i });
    await user.click(plusBtn);

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});
