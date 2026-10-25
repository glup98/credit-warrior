import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PercentageSplitBalance } from './percentage-split-balance';
import type { SplitItem } from './expense-split-builder';

describe('PercentageSplitBalance (Spec 004 T4)', () => {
  it('renders warning state (amber) when total sum is less than 100.00%', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '60.00' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: '20.00' },
    ];

    render(<PercentageSplitBalance splits={splits} />);

    expect(screen.getByText(/Asignado:\s*80\.00%/i)).toBeInTheDocument();
    expect(screen.getByText(/Falta:\s*20\.00%/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '80');
    // Warning status indicator
    expect(progressBar.className).toMatch(/accent-usd|amber/i);
  });

  it('renders error state (rose/red) when total sum exceeds 100.00%', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '70.00' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: '45.00' },
    ];

    render(<PercentageSplitBalance splits={splits} />);

    expect(screen.getByText(/Exceso:\s*115\.00%/i)).toBeInTheDocument();
    expect(screen.getByText(/\(\+15\.00%\)/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    // Error status indicator
    expect(progressBar.className).toMatch(/accent-danger|rose|red/i);
  });

  it('renders success state (emerald/green) when total sum is exactly 100.00%', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '50.00' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: '50.00' },
    ];

    render(<PercentageSplitBalance splits={splits} />);

    expect(screen.getByText(/Balanceado:\s*100\.00%/i)).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    // Success status indicator
    expect(progressBar.className).toMatch(/accent-clp|emerald|green/i);
  });

  it('calculates exact sum in integer cents avoiding floating-point imprecision (33.34 + 33.33 + 33.33 = 100.00%)', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '33.34' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: '33.33' },
      { person_id: 'p-3', split_type: 'PERCENTAGE', percentage: '33.33' },
    ];

    render(<PercentageSplitBalance splits={splits} />);

    // In JS float math: 33.34 + 33.33 + 33.33 = 100.00000000000001, but integer cents = 10000
    expect(screen.getByText(/Balanceado:\s*100\.00%/i)).toBeInTheDocument();
  });

  it('handles empty or blank percentages as 0.00%', () => {
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: null },
    ];

    render(<PercentageSplitBalance splits={splits} />);

    expect(screen.getByText(/Asignado:\s*0\.00%/i)).toBeInTheDocument();
    expect(screen.getByText(/Falta:\s*100\.00%/i)).toBeInTheDocument();
  });

  it('renders and invokes "Distribuir equitativo" utility button', async () => {
    const user = userEvent.setup();
    const handleDistributeEqually = vi.fn();
    const splits: SplitItem[] = [
      { person_id: 'p-1', split_type: 'PERCENTAGE', percentage: '80.00' },
      { person_id: 'p-2', split_type: 'PERCENTAGE', percentage: '20.00' },
    ];

    render(
      <PercentageSplitBalance
        splits={splits}
        onDistributeEqually={handleDistributeEqually}
      />,
    );

    const button = screen.getByRole('button', { name: /Distribuir equitativo/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleDistributeEqually).toHaveBeenCalledTimes(1);
  });
});
