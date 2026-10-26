import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardBreakdownSection } from './card-breakdown-section';
import type { CardMonthlySummary, CardRead } from '@/types/api.types';

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
      default_monthly_fee: '4500',
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
      default_monthly_fee: '0',
      is_active: false, // Tarjeta archivada
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
  [
    'card-3',
    {
      id: 'card-3',
      name: 'Falabella CMR',
      last_four_digits: '9999',
      currency: 'CLP',
      closing_day: 15,
      due_day: 1,
      default_monthly_fee: '3500',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
]);

const mockByCard: CardMonthlySummary[] = [
  {
    card_id: 'card-1',
    card_name: 'Banco Santander',
    currency: 'CLP',
    closing_date: '2026-10-16',
    due_date: '2026-11-05',
    purchases_total: '120000',
    maintenance_fee: '4500',
    total_due: '124500',
    by_person: [
      {
        person_id: 'p-1',
        person_name: 'Glup',
        purchases_amount: '80000',
        fee_share: '2250',
        amount_due: '82250',
      },
      {
        person_id: 'p-2',
        person_name: 'Ada Lovelace',
        purchases_amount: '40000',
        fee_share: '2250',
        amount_due: '42250',
      },
    ],
  },
  {
    card_id: 'card-2',
    card_name: 'Bci Visa USD',
    currency: 'USD',
    closing_date: '2026-10-20',
    due_date: '2026-11-10',
    purchases_total: '45.50',
    maintenance_fee: '0',
    total_due: '45.50',
    by_person: [
      {
        person_id: 'p-1',
        person_name: 'Glup',
        purchases_amount: '45.50',
        fee_share: '0',
        amount_due: '45.50',
      },
    ],
  },
];

describe('CardBreakdownSection Component (Spec 009 T7)', () => {
  it('renders section title "Estado por tarjeta"', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    expect(screen.getByText(/estado por tarjeta/i)).toBeInTheDocument();
  });

  it('renders card names, currency badges, and total amounts', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    expect(screen.getByText('Banco Santander')).toBeInTheDocument();
    expect(screen.getByText('Bci Visa USD')).toBeInTheDocument();

    expect(screen.getByText('$124.500')).toBeInTheDocument();
    expect(screen.getAllByText('US$45.50').length).toBeGreaterThanOrEqual(1);
  });

  it('resolves and masks last_four_digits from cardsMap', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    expect(screen.getByText('•••• 1234')).toBeInTheDocument();
    expect(screen.getByText('•••• 5678')).toBeInTheDocument();
  });

  it('renders "Archivada" pill when card has is_active === false', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    const archivedBadges = screen.getAllByText(/archivada/i);
    expect(archivedBadges).toHaveLength(1);
  });

  it('formats billing cycle dates (closing_date and due_date) legibly in Spanish', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    expect(screen.getByText('16 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('5 nov 2026')).toBeInTheDocument();

    expect(screen.getByText('20 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('10 nov 2026')).toBeInTheDocument();
  });

  it('renders transparency accounting block: purchases_total, maintenance_fee and total_due', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    // Santander y Bci: compras del mes y mantención mensual
    const purchasesLabels = screen.getAllByText('Compras del mes');
    expect(purchasesLabels).toHaveLength(2);
    expect(screen.getByText('$120.000')).toBeInTheDocument();

    const feeLabels = screen.getAllByText('Mantención mensual');
    expect(feeLabels).toHaveLength(2);
    expect(screen.getByText('$4.500')).toBeInTheDocument();

    expect(screen.getByText('$124.500')).toBeInTheDocument();
  });

  it('renders inactive card with $0 maintenance fee and displays "Sin mantención por inactividad"', () => {
    const inactiveCardSummary: CardMonthlySummary = {
      card_id: 'card-3',
      card_name: 'Falabella CMR',
      currency: 'CLP',
      closing_date: '2026-10-15',
      due_date: '2026-11-01',
      purchases_total: '0',
      maintenance_fee: '0',
      total_due: '0',
      by_person: [],
    };

    render(
      <CardBreakdownSection
        byCard={[inactiveCardSummary]}
        cardsMap={mockCardsMap}
      />,
    );

    expect(screen.getByText('Falabella CMR')).toBeInTheDocument();
    expect(screen.getByText(/sin mantención por inactividad/i)).toBeInTheDocument();
  });

  it('renders sub-breakdown by person with purchases_amount, fee_share, and amount_due', () => {
    render(<CardBreakdownSection byCard={mockByCard} cardsMap={mockCardsMap} />);

    // Santander sub-breakdown
    const glupEntries = screen.getAllByText('Glup');
    expect(glupEntries).toHaveLength(2);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    // Total a pagar por persona
    expect(screen.getByText('$82.250')).toBeInTheDocument();
    expect(screen.getByText('$42.250')).toBeInTheDocument();

    // Compras y cuota de mantención individual
    expect(screen.getByText('$80.000')).toBeInTheDocument();
    expect(screen.getByText('$40.000')).toBeInTheDocument();
    const feeShareEntries = screen.getAllByText('$2.250');
    expect(feeShareEntries).toHaveLength(2);
  });

  it('renders empty state when byCard array is empty', () => {
    render(<CardBreakdownSection byCard={[]} cardsMap={mockCardsMap} />);

    expect(
      screen.getByText(/no hay pagos a tarjetas de crédito/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no se registran cobros pendientes para ninguna tarjeta en este período/i),
    ).toBeInTheDocument();
  });
});
