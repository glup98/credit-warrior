import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodSelector } from './period-selector';

describe('PeriodSelector Component', () => {
  it('renders current period in full Spanish format', () => {
    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod="2026-11"
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/noviembre 2026/i)).toBeInTheDocument();
  });

  it('navigates to previous period on clicking previous button', async () => {
    const user = userEvent.setup();
    const handlePeriodChange = vi.fn();

    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod="2026-11"
        onPeriodChange={handlePeriodChange}
      />,
    );

    const prevButton = screen.getByRole('button', { name: /período anterior/i });
    await user.click(prevButton);

    expect(handlePeriodChange).toHaveBeenCalledTimes(1);
    expect(handlePeriodChange).toHaveBeenCalledWith('2026-10');
  });

  it('navigates to next period on clicking next button', async () => {
    const user = userEvent.setup();
    const handlePeriodChange = vi.fn();

    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod="2026-11"
        onPeriodChange={handlePeriodChange}
      />,
    );

    const nextButton = screen.getByRole('button', { name: /período siguiente/i });
    await user.click(nextButton);

    expect(handlePeriodChange).toHaveBeenCalledTimes(1);
    expect(handlePeriodChange).toHaveBeenCalledWith('2026-12');
  });

  it('handles year rollover deterministically (12 -> 01 and 01 -> 12)', async () => {
    const user = userEvent.setup();
    const handlePeriodChange = vi.fn();

    const { rerender } = render(
      <PeriodSelector
        currentPeriod="2026-12"
        defaultPeriod="2026-11"
        onPeriodChange={handlePeriodChange}
      />,
    );

    const nextButton = screen.getByRole('button', { name: /período siguiente/i });
    await user.click(nextButton);
    expect(handlePeriodChange).toHaveBeenCalledWith('2027-01');

    handlePeriodChange.mockClear();

    rerender(
      <PeriodSelector
        currentPeriod="2027-01"
        defaultPeriod="2026-11"
        onPeriodChange={handlePeriodChange}
      />,
    );

    const prevButton = screen.getByRole('button', { name: /período anterior/i });
    await user.click(prevButton);
    expect(handlePeriodChange).toHaveBeenCalledWith('2026-12');
  });

  it('does NOT show "Próximo vencimiento" shortcut button when currentPeriod matches defaultPeriod', () => {
    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod="2026-11"
        onPeriodChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /próximo vencimiento/i }),
    ).not.toBeInTheDocument();
  });

  it('does NOT show "Próximo vencimiento" shortcut button when defaultPeriod is null or undefined', () => {
    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod={null}
        onPeriodChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /próximo vencimiento/i }),
    ).not.toBeInTheDocument();
  });

  it('shows and activates "Próximo vencimiento" shortcut button when currentPeriod differs from defaultPeriod', async () => {
    const user = userEvent.setup();
    const handlePeriodChange = vi.fn();

    render(
      <PeriodSelector
        currentPeriod="2027-03"
        defaultPeriod="2026-11"
        onPeriodChange={handlePeriodChange}
      />,
    );

    const shortcutButton = screen.getByRole('button', { name: /próximo vencimiento/i });
    expect(shortcutButton).toBeInTheDocument();

    await user.click(shortcutButton);
    expect(handlePeriodChange).toHaveBeenCalledTimes(1);
    expect(handlePeriodChange).toHaveBeenCalledWith('2026-11');
  });

  it('meets accessibility touch target requirements (>= 44x44px for navigation buttons)', () => {
    render(
      <PeriodSelector
        currentPeriod="2026-11"
        defaultPeriod="2026-11"
        onPeriodChange={vi.fn()}
      />,
    );

    const prevButton = screen.getByRole('button', { name: /período anterior/i });
    const nextButton = screen.getByRole('button', { name: /período siguiente/i });

    expect(prevButton.className).toMatch(/(h-11|min-h-\[44px\])/);
    expect(prevButton.className).toMatch(/(w-11|min-w-\[44px\])/);
    expect(nextButton.className).toMatch(/(h-11|min-h-\[44px\])/);
    expect(nextButton.className).toMatch(/(w-11|min-w-\[44px\])/);
  });

  it('respects disabled prop and prevents clicks on navigation and shortcut buttons', async () => {
    const user = userEvent.setup();
    const handlePeriodChange = vi.fn();

    render(
      <PeriodSelector
        currentPeriod="2026-10"
        defaultPeriod="2026-11"
        disabled
        onPeriodChange={handlePeriodChange}
      />,
    );

    const prevButton = screen.getByRole('button', { name: /período anterior/i });
    const nextButton = screen.getByRole('button', { name: /período siguiente/i });
    const shortcutButton = screen.getByRole('button', { name: /próximo vencimiento/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
    expect(shortcutButton).toBeDisabled();

    await user.click(prevButton);
    await user.click(nextButton);
    await user.click(shortcutButton);

    expect(handlePeriodChange).not.toHaveBeenCalled();
  });
});
