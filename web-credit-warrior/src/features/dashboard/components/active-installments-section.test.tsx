import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActiveInstallmentsSection } from './active-installments-section';
import type { ActiveInstallmentItem, CardRead, PersonRead } from '@/types/api.types';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

const mockCardsMap = new Map<string, CardRead>([
  [
    'card-1',
    {
      id: 'card-1',
      name: 'Banco Santander',
      last_four_digits: '1234',
      currency: 'CLP',
      closing_day: 16,
      due_day: 5,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
  [
    'card-2',
    {
      id: 'card-2',
      name: 'Bci Visa USD',
      last_four_digits: '5678',
      currency: 'USD',
      closing_day: 20,
      due_day: 10,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
]);

const mockPersonsMap = new Map<string, PersonRead>([
  [
    'p-1',
    {
      id: 'p-1',
      name: 'Glup',
      color_hex: '#10B981',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
  [
    'p-2',
    {
      id: 'p-2',
      name: 'Ada Lovelace',
      color_hex: '#8B5CF6',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
]);

const mockActiveInstallments: ActiveInstallmentItem[] = [
  {
    expense_id: 'exp-1',
    description: 'Supermercado Líder',
    card_id: 'card-1',
    card_name: 'Banco Santander',
    currency: 'CLP',
    purchase_date: '2026-10-15',
    installment_number: 1,
    installments_count: 3,
    installment_label: '1/3',
    installment_amount: '50000',
    person_shares: [
      { person_id: 'p-1', person_name: 'Glup', amount: '25000' },
      { person_id: 'p-2', person_name: 'Ada Lovelace', amount: '25000' },
    ],
  },
  {
    expense_id: 'exp-2',
    description: 'Servidor Cloud',
    card_id: 'card-2',
    card_name: 'Bci Visa USD',
    currency: 'USD',
    purchase_date: '2026-10-10',
    installment_number: 2,
    installments_count: 6,
    installment_label: '2/6',
    installment_amount: '45.50',
    person_shares: [
      { person_id: 'p-1', person_name: 'Glup', amount: '45.50' },
    ],
  },
];

describe('ActiveInstallmentsSection Component', () => {
  it('renders section title "Cuotas activas del período"', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={mockActiveInstallments}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/cuotas activas del período/i)).toBeInTheDocument();
  });

  it('renders active installments details: concept, card, currency, label, date and installment amount', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={mockActiveInstallments}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();
    expect(screen.getByText('Servidor Cloud')).toBeInTheDocument();

    expect(screen.getByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('Bci Visa USD')).toBeInTheDocument();

    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/6')).toBeInTheDocument();

    expect(screen.getByText('15 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('10 oct 2026')).toBeInTheDocument();

    expect(screen.getByText('$50.000')).toBeInTheDocument();
    expect(screen.getAllByText('US$45.50')).toHaveLength(2);
  });

  it('resolves and masks card last_four_digits from cardsMap', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={mockActiveInstallments}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('•••• 1234')).toBeInTheDocument();
    expect(screen.getByText('•••• 5678')).toBeInTheDocument();
  });

  it('renders participant shares with names and individual share amounts', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={mockActiveInstallments}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    const glupChips = screen.getAllByText('Glup');
    expect(glupChips.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getAllByText('$25.000')).toHaveLength(2);
  });

  it('renders accessible "Ver cronograma" buttons and opens ExpenseScheduleDrawer on click', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={mockActiveInstallments}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    const scheduleButtons = screen.getAllByRole('button', { name: /ver cronograma/i });
    expect(scheduleButtons).toHaveLength(2);

    // Al hacer clic abre el drawer adaptativo con role="dialog"
    await user.click(scheduleButtons[0]!);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('renders empty state when activeInstallments is empty', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ActiveInstallmentsSection
          activeInstallments={[]}
          cardsMap={mockCardsMap}
          personsMap={mockPersonsMap}
          currentPeriod="2026-11"
        />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/no hay cuotas activas este mes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no se registran compras ni cuotas pendientes para el período seleccionado/i),
    ).toBeInTheDocument();
  });
});
