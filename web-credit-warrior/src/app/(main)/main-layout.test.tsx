import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './layout';
import HomePage from './page';
import ExpensesPage from './expenses/page';
import CardsPage from './cards/page';
import PersonsPage from './persons/page';
import * as healthService from '@/services/health.service';
import { QuickExpenseProvider } from '@/features/expenses/context/quick-expense-context';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useRouter: vi.fn().mockReturnValue({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams('status=active')),
}));

vi.mock('@/components/layout/onboarding-guard', () => ({
  OnboardingGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-onboarding-guard">{children}</div>
  ),
}));

vi.mock('@/components/layout/desktop-sidebar', () => ({
  DesktopSidebar: () => <aside data-testid="mock-desktop-sidebar">Sidebar</aside>,
}));

vi.mock('@/components/layout/app-header', () => ({
  AppHeader: () => <header data-testid="mock-app-header">Header</header>,
}));

vi.mock('@/components/layout/bottom-nav', () => ({
  BottomNav: () => <nav data-testid="mock-bottom-nav">BottomNav</nav>,
}));

vi.mock('@/services/health.service');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>{children}</QuickExpenseProvider>
      </QueryClientProvider>
    );
  };
}

describe('(main) Route Group and Protected App Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthService.checkHealth).mockResolvedValue({ status: 'ok' });
  });

  describe('MainLayout', () => {
    it('wraps content in OnboardingGuard and mounts DesktopSidebar, AppHeader, and BottomNav', () => {
      render(
        <MainLayout>
          <div data-testid="test-child">App Content</div>
        </MainLayout>,
      );

      expect(screen.getByTestId('mock-onboarding-guard')).toBeInTheDocument();
      expect(screen.getByTestId('mock-desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-app-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bottom-nav')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('App Content')).toBeInTheDocument();
    });
  });

  describe('Protected Pages', () => {
    it('renders HomePage (Dashboard) mounting DashboardView with structured loading skeleton', () => {
      render(<HomePage />, { wrapper: createWrapper() });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-period-selector')).toBeInTheDocument();
    });

    it('renders ExpensesPage with title and contextual header', async () => {
      render(<ExpensesPage />, { wrapper: createWrapper() });

      expect(
        await screen.findByRole('heading', { level: 2, name: 'Compras y Cuotas' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/explora el historial auditable de tus transacciones/i),
      ).toBeInTheDocument();
    });

    it('renders CardsPage with title and cards view', async () => {
      render(<CardsPage />, { wrapper: createWrapper() });

      expect(await screen.findByRole('heading', { level: 2, name: 'Tarjetas de Crédito' })).toBeInTheDocument();
      expect(
        screen.getByText('Administración de tarjetas activas, períodos de facturación y divisas.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /nueva tarjeta/i })).toBeInTheDocument();
    });

    it('renders PersonsPage with title and persons view', async () => {
      render(<PersonsPage />, { wrapper: createWrapper() });

      expect(await screen.findByRole('heading', { level: 2, name: 'Participantes' })).toBeInTheDocument();
      expect(
        screen.getByText('Administración de personas para la asignación y división de gastos compartidos.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /nueva persona/i })).toBeInTheDocument();
    });
  });
});
