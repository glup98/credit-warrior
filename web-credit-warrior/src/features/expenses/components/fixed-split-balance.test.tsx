import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FixedSplitBalance } from './fixed-split-balance';
import type { SplitItem } from './expense-split-builder';

describe('FixedSplitBalance (Spec 004 T5)', () => {
  it('renders warning state (amber) when total sum is less than totalAmount in CLP', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'FIXED_AMOUNT', fixed_amount: '40000' },
      { person_id: 'p-2', split_type: 'FIXED_AMOUNT', fixed_amount: '30000' },
    ];

    render(
      <FixedSplitBalance
        splits={splits}
        totalAmount="100000"
        currency="CLP"
      />,
    );

    expect(screen.getByText(/Restante por asignar:\s*\$30\.000/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '70');
    expect(progressBar.className).toMatch(/accent-usd|amber/i);
  });

  it('renders error state (rose/red) when total sum exceeds totalAmount', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'FIXED_AMOUNT', fixed_amount: '60000' },
      { person_id: 'p-2', split_type: 'FIXED_AMOUNT', fixed_amount: '50000' },
    ];

    render(
      <FixedSplitBalance
        splits={splits}
        totalAmount="100000"
        currency="CLP"
      />,
    );

    expect(screen.getByText(/Monto excedido por:\s*\$10\.000/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar.className).toMatch(/accent-danger|rose|red/i);
  });

  it('renders success state (emerald/green) when sum covers totalAmount exactly', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'FIXED_AMOUNT', fixed_amount: '50000' },
      { person_id: 'p-2', split_type: 'FIXED_AMOUNT', fixed_amount: '50000' },
    ];

    render(
      <FixedSplitBalance
        splits={splits}
        totalAmount="100000"
        currency="CLP"
      />,
    );

    expect(screen.getByText(/Total cubierto exactamente/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar.className).toMatch(/accent-clp|emerald|green/i);
  });

  it('handles USD currency with decimal cents precisely (e.g. US$100.00 - US$80.75 = US$19.25)', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'FIXED_AMOUNT', fixed_amount: '60.50' },
      { person_id: 'p-2', split_type: 'FIXED_AMOUNT', fixed_amount: '20.25' },
    ];

    render(
      <FixedSplitBalance
        splits={splits}
        totalAmount="100.00"
        currency="USD"
      />,
    );

    expect(screen.getByText(/Restante por asignar:\s*US\$19\.25/i)).toBeInTheDocument();
  });

  it('displays placeholder note when totalAmount is not yet entered', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'FIXED_AMOUNT', fixed_amount: '10000' },
    ];

    render(
      <FixedSplitBalance
        splits={splits}
        totalAmount=""
        currency="CLP"
      />,
    );

    expect(
      screen.getByText(/Ingresa el monto total del gasto para calcular el restante/i),
    ).toBeInTheDocument();
  });
});
