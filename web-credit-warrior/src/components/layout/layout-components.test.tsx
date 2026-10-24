import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { useHealthCheck } from '@/hooks/queries/use-health';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './bottom-nav';
import { DesktopSidebar } from './desktop-sidebar';
import { AppHeader } from './app-header';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

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

describe('App Shell Layout Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useHealthCheck).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useHealthCheck>);
  });

  describe('BottomNav', () => {
    it('renders all 4 navigation destinations with accessible labels', () => {
      render(<BottomNav />, { wrapper: createWrapper() });

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /compras/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /tarjetas/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /personas/i })).toBeInTheDocument();
    });

    it('highlights the active link based on pathname', () => {
      vi.mocked(usePathname).mockReturnValue('/expenses');
      render(<BottomNav />, { wrapper: createWrapper() });

      const activeLink = screen.getByRole('link', { name: /compras/i });
      const inactiveLink = screen.getByRole('link', { name: /dashboard/i });

      expect(activeLink.className).toContain('text-accent-clp');
      expect(inactiveLink.className).toContain('text-text-muted');
    });

    it('calls open when clicking the central prominent + button', async () => {
      const user = userEvent.setup();
      render(<BottomNav />, { wrapper: createWrapper() });

      const plusBtn = screen.getByRole('button', { name: /registrar/i });
      expect(plusBtn).toBeInTheDocument();

      await user.click(plusBtn);
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('DesktopSidebar', () => {
    it('renders branding and vertical navigation links', () => {
      render(<DesktopSidebar />, { wrapper: createWrapper() });

      expect(screen.getByText('Credit Warrior')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /compras/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /tarjetas/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /personas/i })).toBeInTheDocument();
    });

    it('highlights the active navigation link based on current path', () => {
      vi.mocked(usePathname).mockReturnValue('/cards');
      render(<DesktopSidebar />, { wrapper: createWrapper() });

      const activeLink = screen.getByRole('link', { name: /tarjetas/i });
      const inactiveLink = screen.getByRole('link', { name: /dashboard/i });

      expect(activeLink.className).toContain('text-accent-clp');
      expect(activeLink.className).toContain('border-accent-clp');
      expect(inactiveLink.className).toContain('text-text-muted');
    });

    it('calls open when clicking the Registrar gasto button', async () => {
      const user = userEvent.setup();
      render(<DesktopSidebar />, { wrapper: createWrapper() });

      const registerBtn = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(registerBtn);

      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('displays backend health status in sidebar footer', () => {
      vi.mocked(useHealthCheck).mockReturnValue({
        data: { status: 'ok' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useHealthCheck>);

      render(<DesktopSidebar />, { wrapper: createWrapper() });
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('displays offline status when backend health check fails', () => {
      vi.mocked(useHealthCheck).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof useHealthCheck>);

      render(<DesktopSidebar />, { wrapper: createWrapper() });
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  describe('AppHeader', () => {
    it.each([
      ['/', 'Dashboard'],
      ['/expenses', 'Compras y Cuotas'],
      ['/cards', 'Tarjetas de Crédito'],
      ['/persons', 'Participantes'],
      ['/settings', 'Credit Warrior'],
    ])('renders correct title "%s" for path "%s"', (path, expectedTitle) => {
      vi.mocked(usePathname).mockReturnValue(path);
      render(<AppHeader />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expectedTitle);
    });

    it('displays backend connection indicator in header', () => {
      vi.mocked(useHealthCheck).mockReturnValue({
        data: { status: 'ok' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useHealthCheck>);

      render(<AppHeader />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('displays verifying indicator when health check is loading', () => {
      vi.mocked(useHealthCheck).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof useHealthCheck>);

      render(<AppHeader />);
      expect(screen.getByText('Verificando...')).toBeInTheDocument();
    });
  });
});
