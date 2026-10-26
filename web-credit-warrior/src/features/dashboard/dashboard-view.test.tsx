import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardView } from './dashboard-view';
import {
  useDashboardSummary,
  useDashboardProjection,
} from '@/hooks/queries/use-dashboard';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  QuickExpenseProvider,
  useQuickExpense,
} from '@/features/expenses/context/quick-expense-context';
import type {
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  CardRead,
  PersonRead,
} from '@/types/api.types';

// Mock de ResponsiveContainer para jsdom
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" className="recharts-responsive-container">
        {children}
      </div>
    ),
  };
});

vi.mock('@/hooks/queries/use-dashboard', () => ({
  useDashboardSummary: vi.fn(),
  useDashboardProjection: vi.fn(),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

function mockParams(init?: string) {
  return new URLSearchParams(init) as unknown as ReturnType<typeof useSearchParams>;
}

const mockCards: CardRead[] = [
  {
    id: 'card-1',
    name: 'Santander Platinum',
    last_four_digits: '1234',
    currency: 'CLP',
    closing_day: 16,
    due_day: 5,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockPersons: PersonRead[] = [
  {
    id: 'person-1',
    name: 'Glup',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockSummary: DashboardSummaryResponse = {
  period: '2026-11',
  totals_by_currency: { CLP: '150000', USD: '45.50' },
  by_card: [
    {
      card_id: 'card-1',
      card_name: 'Santander Platinum',
      currency: 'CLP',
      closing_date: '2026-10-16',
      due_date: '2026-11-05',
      total_due: '150000',
      by_person: [
        { person_id: 'person-1', person_name: 'Glup', amount_due: '150000' },
      ],
    },
  ],
  by_person: [
    {
      person_id: 'person-1',
      person_name: 'Glup',
      totals_by_currency: { CLP: '150000', USD: '45.50' },
    },
  ],
  active_installments: [
    {
      expense_id: 'exp-1',
      description: 'Supermercado Líder',
      card_id: 'card-1',
      card_name: 'Santander Platinum',
      currency: 'CLP',
      purchase_date: '2026-10-15',
      installment_number: 1,
      installments_count: 3,
      installment_label: '1/3',
      installment_amount: '50000',
      person_shares: [
        { person_id: 'person-1', person_name: 'Glup', amount: '50000' },
      ],
    },
  ],
};

const mockProjection: DashboardProjectionResponse = {
  start_period: '2026-11',
  months: 2,
  periods: [
    mockSummary,
    {
      period: '2026-12',
      totals_by_currency: { CLP: '50000', USD: '0.00' },
      by_card: [],
      by_person: [],
      active_installments: [],
    },
  ],
};

function ConsumerSpy() {
  const { isOpen } = useQuickExpense();
  return <div data-testid="quick-expense-status">{isOpen ? 'open' : 'closed'}</div>;
}

function renderDashboardView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <QuickExpenseProvider>
        <DashboardView />
        <ConsumerSpy />
      </QuickExpenseProvider>
    </QueryClientProvider>,
  );
}

describe('DashboardView Coordinator Component', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    } as unknown as ReturnType<typeof useRouter>);

    vi.mocked(useCards).mockReturnValue({
      data: mockCards,
      isLoading: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: mockPersons,
      isLoading: false,
    } as unknown as ReturnType<typeof usePersons>);

    vi.mocked(useDashboardProjection).mockReturnValue({
      data: mockProjection,
      isLoading: false,
    } as unknown as ReturnType<typeof useDashboardProjection>);
  });

  it('renders DashboardSkeletons when summary or catalogs are loading', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams());
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-period-selector')).toBeInTheDocument();
  });

  it('renders accessible error state and allows retrying when summary fetch fails', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    vi.mocked(useSearchParams).mockReturnValue(mockParams());
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    expect(
      screen.getByText(/no se pudo cargar el panel financiero/i),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('automatically synchronizes default period into URL when query param is absent', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams());
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    expect(mockReplace).toHaveBeenCalledWith('?period=2026-11', { scroll: false });
  });

  it('discards corrupt period parameter (e.g. ?period=2026-99) and queries default period', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-99'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    // Invoca useDashboardSummary con undefined porque 2026-99 es inválido
    expect(useDashboardSummary).toHaveBeenCalledWith(undefined);
  });

  it('renders all sections and cross-resolves metadata in memory', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    // 1. Selector de período
    expect(screen.getByText(/noviembre 2026/i)).toBeInTheDocument();

    // 2. KPIs
    expect(screen.getByText(/total a pagar clp/i)).toBeInTheDocument();
    expect(screen.getAllByText('$150.000').length).toBeGreaterThanOrEqual(1);

    // 3. Person breakdown
    expect(screen.getByText(/cuánto paga cada uno/i)).toBeInTheDocument();

    // 4. Card breakdown
    expect(screen.getByText(/estado por tarjeta/i)).toBeInTheDocument();
    expect(screen.getAllByText('•••• 1234').length).toBeGreaterThanOrEqual(1);

    // 5. Active installments
    expect(screen.getByText(/cuotas activas del período/i)).toBeInTheDocument();
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();

    // 6. Projection chart
    expect(screen.getByText(/proyección a 6 meses/i)).toBeInTheDocument();
  });

  it('navigates to new period via router.push when period is changed in PeriodSelector', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    const nextPeriodBtn = screen.getByRole('button', { name: /período siguiente/i });
    await user.click(nextPeriodBtn);

    expect(mockPush).toHaveBeenCalledWith('?period=2026-12', { scroll: false });
  });

  it('renders friendly zero-state and triggers QuickExpenseDrawer when no debt or active installments exist', async () => {
    const user = userEvent.setup();
    const emptySummary: DashboardSummaryResponse = {
      period: '2026-11',
      totals_by_currency: { CLP: '0', USD: '0.00' },
      by_card: [],
      by_person: [],
      active_installments: [],
    };

    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: emptySummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardView();

    expect(screen.getByText(/sin cobros en este período/i)).toBeInTheDocument();

    const registerButton = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(registerButton);

    // Debe abrir el QuickExpenseDrawer
    expect(screen.getByTestId('quick-expense-status')).toHaveTextContent('open');
  });
});
