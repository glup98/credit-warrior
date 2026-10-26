import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@/app/(main)/page';
import { DashboardView } from './dashboard-view';
import {
  useDashboardSummary,
  useDashboardProjection,
} from '@/hooks/queries/use-dashboard';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useExpenseSchedule } from '@/hooks/queries/use-expenses';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  QuickExpenseProvider,
  useQuickExpense,
} from '@/features/expenses/context/quick-expense-context';
import type {
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  ExpenseScheduleResponse,
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

vi.mock('@/hooks/queries/use-expenses', () => ({
  useExpenseSchedule: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn().mockReturnValue(true),
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
    is_active: true,
    closing_day: 25,
    due_day: 10,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'card-2',
    name: 'Banco de Chile Signature',
    last_four_digits: '5678',
    currency: 'USD',
    is_active: true,
    closing_day: 20,
    due_day: 5,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockPersons: PersonRead[] = [
  {
    id: 'person-1',
    name: 'Anyi Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-2',
    name: 'Augusto Soto',
    color_hex: '#38BDF8',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockSummary: DashboardSummaryResponse = {
  period: '2026-11',
  totals_by_currency: {
    CLP: '150000',
    USD: '45.50',
  },
  by_person: [
    {
      person_id: 'person-1',
      person_name: 'Anyi Rojas',
      totals_by_currency: { CLP: '75000', USD: '22.75' },
    },
    {
      person_id: 'person-2',
      person_name: 'Augusto Soto',
      totals_by_currency: { CLP: '75000', USD: '22.75' },
    },
  ],
  by_card: [
    {
      card_id: 'card-1',
      card_name: 'Santander Platinum',
      currency: 'CLP',
      closing_date: '2026-11-25',
      due_date: '2026-11-10',
      total_due: '150000',
      by_person: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', amount_due: '75000' },
        { person_id: 'person-2', person_name: 'Augusto Soto', amount_due: '75000' },
      ],
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
      installment_number: 2,
      installments_count: 3,
      installment_label: '2/3',
      installment_amount: '50000',
      person_shares: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', amount: '25000' },
        { person_id: 'person-2', person_name: 'Augusto Soto', amount: '25000' },
      ],
    },
  ],
};

const mockProjection: DashboardProjectionResponse = {
  start_period: '2026-11',
  months: 6,
  periods: [
    mockSummary,
    {
      period: '2026-12',
      totals_by_currency: { CLP: '50000', USD: '0.00' },
      by_person: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', totals_by_currency: { CLP: '25000' } },
        { person_id: 'person-2', person_name: 'Augusto Soto', totals_by_currency: { CLP: '25000' } },
      ],
      by_card: [],
      active_installments: [],
    },
    {
      period: '2027-01',
      totals_by_currency: { CLP: '50000', USD: '0.00' },
      by_person: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', totals_by_currency: { CLP: '25000' } },
        { person_id: 'person-2', person_name: 'Augusto Soto', totals_by_currency: { CLP: '25000' } },
      ],
      by_card: [],
      active_installments: [],
    },
    {
      period: '2027-02',
      totals_by_currency: { CLP: '0', USD: '0.00' },
      by_person: [],
      by_card: [],
      active_installments: [],
    },
    {
      period: '2027-03',
      totals_by_currency: { CLP: '0', USD: '0.00' },
      by_person: [],
      by_card: [],
      active_installments: [],
    },
    {
      period: '2027-04',
      totals_by_currency: { CLP: '0', USD: '0.00' },
      by_person: [],
      by_card: [],
      active_installments: [],
    },
  ],
};

const mockScheduleExp1: ExpenseScheduleResponse = {
  expense_id: 'exp-1',
  description: 'Supermercado Líder',
  card_id: 'card-1',
  card_name: 'Santander Platinum',
  currency: 'CLP',
  total_amount: '150000',
  installments_count: 3,
  schedule: [
    {
      installment_number: 1,
      installments_count: 3,
      installment_label: '1/3',
      statement_period: '2026-10',
      payment_period: '2026-10',
      closing_date: '2026-10-25',
      due_date: '2026-10-10',
      installment_amount: '50000',
      person_shares: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', amount: '25000' },
        { person_id: 'person-2', person_name: 'Augusto Soto', amount: '25000' },
      ],
    },
    {
      installment_number: 2,
      installments_count: 3,
      installment_label: '2/3',
      statement_period: '2026-11',
      payment_period: '2026-11',
      closing_date: '2026-11-25',
      due_date: '2026-11-10',
      installment_amount: '50000',
      person_shares: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', amount: '25000' },
        { person_id: 'person-2', person_name: 'Augusto Soto', amount: '25000' },
      ],
    },
    {
      installment_number: 3,
      installments_count: 3,
      installment_label: '3/3',
      statement_period: '2026-12',
      payment_period: '2026-12',
      closing_date: '2026-12-25',
      due_date: '2026-12-10',
      installment_amount: '50000',
      person_shares: [
        { person_id: 'person-1', person_name: 'Anyi Rojas', amount: '25000' },
        { person_id: 'person-2', person_name: 'Augusto Soto', amount: '25000' },
      ],
    },
  ],
};

// Componente espía para verificar estado de QuickExpenseDrawer
function QuickExpenseStatusSpy() {
  const { isOpen } = useQuickExpense();
  return <div data-testid="quick-expense-status">{isOpen ? 'open' : 'closed'}</div>;
}

describe('Dashboard E2E Integration Suite', () => {
  let queryClient: QueryClient;
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
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

    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleExp1,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);
  });

  const renderDashboardIntegration = (ui = <DashboardView />) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>
          {ui}
          <QuickExpenseStatusSpy />
        </QuickExpenseProvider>
      </QueryClientProvider>,
    );
  };

  it('1. Initial load without period param adopts default backend period and renders full dashboard', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams());
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardIntegration();

    // Sincronización automática de URL con período por defecto
    expect(mockReplace).toHaveBeenCalledWith('?period=2026-11', { scroll: false });

    // 1. Selector de período con formato español completo
    expect(screen.getByText(/noviembre 2026/i)).toBeInTheDocument();

    // 2. Tarjetas de Resumen KPI
    expect(screen.getByText(/total a pagar clp/i)).toBeInTheDocument();
    expect(screen.getByText(/total a pagar usd/i)).toBeInTheDocument();
    expect(screen.getAllByText('$150.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('US$45.50').length).toBeGreaterThanOrEqual(1);

    // 3. Desglose por Persona
    expect(screen.getByText(/cuánto paga cada uno/i)).toBeInTheDocument();
    expect(screen.getAllByText('Anyi Rojas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Augusto Soto').length).toBeGreaterThanOrEqual(1);

    // 4. Desglose por Tarjeta
    expect(screen.getByText(/estado por tarjeta/i)).toBeInTheDocument();
    expect(screen.getAllByText('Santander Platinum').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('•••• 1234').length).toBeGreaterThanOrEqual(1);

    // 5. Cuotas Activas
    expect(screen.getByText(/cuotas activas del período/i)).toBeInTheDocument();
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();

    // 6. Proyección a 6 Meses
    expect(screen.getByText(/proyección a 6 meses/i)).toBeInTheDocument();
  });

  it('2. Temporal navigation allows traversing months and returning via "Próximo vencimiento"', async () => {
    const user = userEvent.setup();

    // Simula que el usuario está en el período por defecto (2026-11)
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    const { rerender } = renderDashboardIntegration();

    // No debe mostrar botón de "Próximo vencimiento" si ya estamos en el período por defecto
    expect(screen.queryByRole('button', { name: /próximo vencimiento/i })).not.toBeInTheDocument();

    // Navegar al siguiente mes
    const nextBtn = screen.getByRole('button', { name: /período siguiente/i });
    await user.click(nextBtn);
    expect(mockPush).toHaveBeenCalledWith('?period=2026-12', { scroll: false });

    // Ahora simula que la URL cambió a 2026-12 mientras el default es 2026-11
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-12'));
    rerender(
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>
          <DashboardView />
          <QuickExpenseStatusSpy />
        </QuickExpenseProvider>
      </QueryClientProvider>,
    );

    // Debe aparecer el botón de atajo "Próximo vencimiento"
    const shortcutBtn = screen.getByRole('button', { name: /próximo vencimiento/i });
    expect(shortcutBtn).toBeInTheDocument();

    // Al hacer clic en el atajo, vuelve al período default (2026-11)
    await user.click(shortcutBtn);
    expect(mockPush).toHaveBeenCalledWith('?period=2026-11', { scroll: false });
  });

  it('3. Currency toggle and fast-period navigation in projection chart', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardIntegration();

    // Selector de moneda en el gráfico
    const usdBtn = screen.getByRole('button', { name: 'USD' });
    await user.click(usdBtn);

    // Botón rápido de período en la leyenda del gráfico (ej. 2027-01)
    const jumpBtn = screen.getByRole('button', { name: /ver período ene 2027/i });
    await user.click(jumpBtn);

    expect(mockPush).toHaveBeenCalledWith('?period=2027-01', { scroll: false });
  });

  it('4. Clicking "Ver cronograma" on an active installment opens ExpenseScheduleDrawer with highlighted active installment', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardIntegration();

    const scheduleBtn = screen.getByRole('button', {
      name: /ver cronograma de amortización de supermercado líder/i,
    });
    await user.click(scheduleBtn);

    // Se abre el diálogo/drawer del cronograma
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/cronograma de amortización/i)).toBeInTheDocument();

    // Verifica que useExpenseSchedule fue consultado con el ID de la compra
    expect(useExpenseSchedule).toHaveBeenCalledWith('exp-1');

    // La cuota del período activo (2/3, 2026-11) tiene el badge "Próximo pago"
    expect(screen.getByText('Próximo pago')).toBeInTheDocument();
  });

  it('5. Peaceful zero-state renders friendly message and opens QuickExpenseDrawer via CTA', async () => {
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

    renderDashboardIntegration();

    expect(screen.getByText(/sin cobros en este período/i)).toBeInTheDocument();

    const registerBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(registerBtn);

    expect(screen.getByTestId('quick-expense-status')).toHaveTextContent('open');
  });

  it('6. Root page HomePage mounts DashboardView seamlessly inside Suspense boundary', () => {
    vi.mocked(useSearchParams).mockReturnValue(mockParams('period=2026-11'));
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: mockSummary,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboardIntegration(<HomePage />);

    // Se renderiza el selector y componentes del Dashboard montado a través de HomePage
    expect(screen.getByText(/noviembre 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/total a pagar clp/i)).toBeInTheDocument();
  });
});
