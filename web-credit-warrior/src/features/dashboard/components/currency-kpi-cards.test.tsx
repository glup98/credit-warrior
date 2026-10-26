import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyKpiCards } from './currency-kpi-cards';
import type { ActiveInstallmentItem } from '@/types/api.types';

const mockActiveInstallments: ActiveInstallmentItem[] = [
  {
    expense_id: 'exp-1',
    description: 'Supermercado',
    card_id: 'card-1',
    card_name: 'Banco Santander',
    currency: 'CLP',
    purchase_date: '2026-10-15',
    installment_number: 1,
    installments_count: 3,
    installment_label: '1/3',
    installment_amount: '50000',
    person_shares: [
      { person_id: 'p-1', person_name: 'Glup', amount: '50000' },
    ],
  },
  {
    expense_id: 'exp-2',
    description: 'Farmacia',
    card_id: 'card-1',
    card_name: 'Banco Santander',
    currency: 'CLP',
    purchase_date: '2026-10-20',
    installment_number: 1,
    installments_count: 1,
    installment_label: '1/1',
    installment_amount: '100000',
    person_shares: [
      { person_id: 'p-1', person_name: 'Glup', amount: '100000' },
    ],
  },
  {
    expense_id: 'exp-3',
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

describe('CurrencyKpiCards Component', () => {
  it('renders both CLP and USD summary cards with concept titles', () => {
    render(
      <CurrencyKpiCards
        totalsByCurrency={{ CLP: '150000', USD: '45.50' }}
        activeInstallments={mockActiveInstallments}
      />,
    );

    expect(screen.getByText(/total a pagar clp/i)).toBeInTheDocument();
    expect(screen.getByText(/total a pagar usd/i)).toBeInTheDocument();
  });

  it('formats monetary amounts in tabular figures for each currency', () => {
    render(
      <CurrencyKpiCards
        totalsByCurrency={{ CLP: '150000', USD: '45.50' }}
        activeInstallments={mockActiveInstallments}
      />,
    );

    expect(screen.getByText('$150.000')).toBeInTheDocument();
    expect(screen.getByText('US$45.50')).toBeInTheDocument();
  });

  it('derives active installments count accurately per currency', () => {
    render(
      <CurrencyKpiCards
        totalsByCurrency={{ CLP: '150000', USD: '45.50' }}
        activeInstallments={mockActiveInstallments}
      />,
    );

    expect(screen.getByText(/2 cuotas activas/i)).toBeInTheDocument();
    expect(screen.getByText(/1 cuota activa/i)).toBeInTheDocument();
  });

  it('renders neutral state and "0 compromisos pendientes" when total is 0 or zero installments', () => {
    render(
      <CurrencyKpiCards
        totalsByCurrency={{ CLP: '0', USD: '0.00' }}
        activeInstallments={[]}
      />,
    );

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('US$0.00')).toBeInTheDocument();

    const pendingLabels = screen.getAllByText(/0 compromisos pendientes/i);
    expect(pendingLabels).toHaveLength(2);
  });

  it('handles empty or missing totals gracefully', () => {
    render(<CurrencyKpiCards totalsByCurrency={{}} activeInstallments={[]} />);

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('US$0.00')).toBeInTheDocument();

    const pendingLabels = screen.getAllByText(/0 compromisos pendientes/i);
    expect(pendingLabels).toHaveLength(2);
  });

  it('includes semantic border accents for CLP and USD cards', () => {
    const { container } = render(
      <CurrencyKpiCards
        totalsByCurrency={{ CLP: '150000', USD: '45.50' }}
        activeInstallments={mockActiveInstallments}
      />,
    );

    const clpCard = container.querySelector('[data-currency="CLP"]');
    const usdCard = container.querySelector('[data-currency="USD"]');

    expect(clpCard).toBeInTheDocument();
    expect(usdCard).toBeInTheDocument();

    expect(clpCard?.className).toMatch(/border.*clp/i);
    expect(usdCard?.className).toMatch(/border.*usd/i);
  });
});
