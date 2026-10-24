import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DesktopSidebar } from './desktop-sidebar';
import { usePathname } from 'next/navigation';
import { useHealthCheck } from '@/hooks/queries/use-health';
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

vi.mock('@/hooks/queries/use-health', () => ({
  useHealthCheck: vi.fn(),
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

describe('DesktopSidebar Component (Spec 007 T5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useHealthCheck).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useHealthCheck>);
  });

  it('1. Renderiza el branding, enlaces de navegación y botón de registro de gasto', () => {
    render(<DesktopSidebar />, { wrapper: createWrapper() });

    expect(screen.getByText('Credit Warrior')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar gasto/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /compras/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tarjetas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /personas/i })).toBeInTheDocument();
  });

  it('2. Dispara prefetchNavigationTarget en onMouseEnter y onFocus sobre los enlaces', () => {
    render(<DesktopSidebar />, { wrapper: createWrapper() });

    const expensesLink = screen.getByRole('link', { name: /compras/i });
    fireEvent.mouseEnter(expensesLink);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/expenses', expect.any(Object));

    const cardsLink = screen.getByRole('link', { name: /tarjetas/i });
    fireEvent.focus(cardsLink);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/cards', expect.any(Object));
  });

  it('3. Activa optimista e inmediatamente (0ms) el enlace seleccionado con acento y borde activo', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(<DesktopSidebar />, { wrapper: createWrapper() });

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    const expensesLink = screen.getByRole('link', { name: /compras/i });

    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(expensesLink).not.toHaveAttribute('aria-current', 'page');

    // Clic en Compras
    expensesLink.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(expensesLink);

    // Activación optimista inmediata a 0ms (pathname aún no cambia)
    expect(expensesLink).toHaveAttribute('aria-current', 'page');
    expect(expensesLink.className).toContain('text-accent-clp');
    expect(expensesLink.className).toContain('border-accent-clp');
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('4. Reconcilia el estado optimista cuando pathname cambia a la nueva ruta', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    const { rerender } = render(<DesktopSidebar />, { wrapper: createWrapper() });

    const cardsLink = screen.getByRole('link', { name: /tarjetas/i });
    cardsLink.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(cardsLink);

    expect(cardsLink).toHaveAttribute('aria-current', 'page');

    // Sincronización efectiva al confirmarse la ruta en Next.js
    vi.mocked(usePathname).mockReturnValue('/cards');
    rerender(<DesktopSidebar />);

    expect(cardsLink).toHaveAttribute('aria-current', 'page');
    expect(cardsLink.className).toContain('text-accent-clp');
  });

  it('5. Invoca open() al hacer clic en el botón "Registrar gasto"', async () => {
    const user = userEvent.setup();
    render(<DesktopSidebar />, { wrapper: createWrapper() });

    const registerBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(registerBtn);

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('6. Muestra el estado del backend en el footer de la barra lateral', () => {
    render(<DesktopSidebar />, { wrapper: createWrapper() });

    expect(screen.getByText(/servidor/i)).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
