import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { CardSelectChips } from './card-select-chips';
import { useCards } from '@/hooks/queries/use-cards';
import type { CardRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

const mockCards: CardRead[] = [
  {
    id: 'card-clp-1',
    name: 'Santander Black',
    last_four_digits: '1234',
    currency: 'CLP',
    closing_day: 20,
    due_day: 5,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'card-usd-2',
    name: 'BCI Visa Signature',
    last_four_digits: '5678',
    currency: 'USD',
    closing_day: 12,
    due_day: 25,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

describe('CardSelectChips Component (Spec 004 T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active cards chips with name, masked digits, and currency badge', () => {
    vi.mocked(useCards).mockReturnValue({
      data: mockCards,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    render(
      <CardSelectChips
        value="card-clp-1"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Santander Black')).toBeInTheDocument();
    expect(screen.getByText('•••• 1234')).toBeInTheDocument();
    expect(screen.getByText('CLP')).toBeInTheDocument();

    expect(screen.getByText('BCI Visa Signature')).toBeInTheDocument();
    expect(screen.getByText('•••• 5678')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();

    // Comprobar estado de selección
    const clpChip = screen.getByRole('radio', { name: /santander black/i });
    const usdChip = screen.getByRole('radio', { name: /bci visa signature/i });

    expect(clpChip).toHaveAttribute('aria-checked', 'true');
    expect(usdChip).toHaveAttribute('aria-checked', 'false');
  });

  it('auto-selects card if there is exactly one active card and no value is selected', () => {
    const singleCard = [mockCards[0]];
    vi.mocked(useCards).mockReturnValue({
      data: singleCard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    const onChange = vi.fn();
    render(<CardSelectChips onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('card-clp-1', singleCard[0]);
  });

  it('invokes onChange when clicking an unselected card', async () => {
    const user = userEvent.setup();
    vi.mocked(useCards).mockReturnValue({
      data: mockCards,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    const onChange = vi.fn();
    render(
      <CardSelectChips
        value="card-clp-1"
        onChange={onChange}
      />,
    );

    const usdChip = screen.getByRole('radio', { name: /bci visa signature/i });
    await user.click(usdChip);

    expect(onChange).toHaveBeenCalledWith('card-usd-2', mockCards[1]);
  });

  it('resets entered amounts and emits info toast when switching to a card with a different currency and amounts exist', async () => {
    const user = userEvent.setup();
    vi.mocked(useCards).mockReturnValue({
      data: mockCards,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    const onChange = vi.fn();
    const onResetAmounts = vi.fn();
    const onCurrencyChange = vi.fn();

    render(
      <CardSelectChips
        value="card-clp-1"
        onChange={onChange}
        hasEnteredAmount={true}
        onResetAmounts={onResetAmounts}
        onCurrencyChange={onCurrencyChange}
      />,
    );

    // Cambiar de CLP a USD
    const usdChip = screen.getByRole('radio', { name: /bci visa signature/i });
    await user.click(usdChip);

    expect(onChange).toHaveBeenCalledWith('card-usd-2', mockCards[1]);
    expect(onResetAmounts).toHaveBeenCalledTimes(1);
    expect(onCurrencyChange).toHaveBeenCalledWith('USD', 'CLP');
    expect(toast.info).toHaveBeenCalledWith(
      'Moneda cambiada a USD: se restablecieron los montos para evitar discrepancias de escala',
    );
  });

  it('does NOT emit toast or reset amounts if currency is the same or hasEnteredAmount is false', async () => {
    const user = userEvent.setup();
    const sameCurrencyCards: CardRead[] = [
      mockCards[0],
      {
        ...mockCards[1],
        id: 'card-clp-2',
        name: 'Banco de Chile',
        currency: 'CLP',
      },
    ];

    vi.mocked(useCards).mockReturnValue({
      data: sameCurrencyCards,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    const onChange = vi.fn();
    const onResetAmounts = vi.fn();

    render(
      <CardSelectChips
        value="card-clp-1"
        onChange={onChange}
        hasEnteredAmount={true}
        onResetAmounts={onResetAmounts}
      />,
    );

    // Cambiar a otra tarjeta en CLP
    const secondCard = screen.getByRole('radio', { name: /banco de chile/i });
    await user.click(secondCard);

    expect(onChange).toHaveBeenCalledWith('card-clp-2', sameCurrencyCards[1]);
    expect(onResetAmounts).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('renders orientative banner with link to /cards when there are 0 active cards', () => {
    vi.mocked(useCards).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    render(<CardSelectChips onChange={vi.fn()} />);

    expect(screen.getByText(/sin tarjetas activas/i)).toBeInTheDocument();
    expect(
      screen.getByText(/debes registrar o activar una tarjeta de crédito para registrar compras/i),
    ).toBeInTheDocument();

    const linkToCards = screen.getByRole('link', { name: /ir a tarjetas/i });
    expect(linkToCards).toBeInTheDocument();
    expect(linkToCards).toHaveAttribute('href', '/cards');
  });

  it('renders loading skeleton when isLoading is true', () => {
    vi.mocked(useCards).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    render(<CardSelectChips onChange={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/cargando tarjetas/i)).toBeInTheDocument();
  });
});
