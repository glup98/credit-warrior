import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CardsView } from './cards-view';
import * as cardsService from '@/services/cards.service';
import { ApiError } from '@/services/api-client';
import type { CardRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/services/cards.service', () => ({
  listCards: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  listCardFees: vi.fn().mockResolvedValue([]),
  getCardFee: vi.fn(),
  setCardFee: vi.fn(),
  deleteCardFee: vi.fn(),
  cardsService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listFees: vi.fn().mockResolvedValue([]),
    getFee: vi.fn(),
    setFee: vi.fn(),
    deleteFee: vi.fn(),
  },
}));

const mockCards: CardRead[] = [
  {
    id: 'card-1',
    name: 'Santander Black',
    last_four_digits: '1111',
    currency: 'CLP',
    closing_day: 20,
    due_day: 5,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'card-2',
    name: 'BCI Visa Signature',
    last_four_digits: '2222',
    currency: 'USD',
    closing_day: 12,
    due_day: 25,
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'card-3',
    name: 'Falabella CMR',
    last_four_digits: '3333',
    currency: 'CLP',
    closing_day: 15,
    due_day: 1,
    is_active: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CardsView Component (Spec 003 T5)', () => {
  let mockReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue('/cards');
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=active') as unknown as ReturnType<typeof useSearchParams>);
    vi.mocked(cardsService.listCards).mockResolvedValue(mockCards);
  });

  it('renders cards catalog with tabs and memory-calculated counts: Activas (2), Archivadas (1), Todas (3)', async () => {
    renderWithClient(<CardsView />);

    expect(await screen.findByText('Santander Black')).toBeInTheDocument();
    expect(screen.getByText('BCI Visa Signature')).toBeInTheDocument();
    // En pestaña activa, la tarjeta archivada no debe ser visible
    expect(screen.queryByText('Falabella CMR')).not.toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /activas \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /archivadas \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /todas \(3\)/i })).toBeInTheDocument();
  });

  it('filters by status from URL search params (e.g. status=archived shows only archived)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=archived') as unknown as ReturnType<typeof useSearchParams>);

    renderWithClient(<CardsView />);

    expect(await screen.findByText('Falabella CMR')).toBeInTheDocument();
    expect(screen.queryByText('Santander Black')).not.toBeInTheDocument();
    expect(screen.queryByText('BCI Visa Signature')).not.toBeInTheDocument();
  });

  it('updates URL search params when clicking another status tab', async () => {
    renderWithClient(<CardsView />);

    const archivedTab = await screen.findByRole('tab', { name: /archivadas/i });
    await userEvent.click(archivedTab);

    expect(mockReplace).toHaveBeenCalledWith('/cards?status=archived', { scroll: false });
  });

  it('opens CardFormDialog in creation mode when clicking "Nueva tarjeta" button', async () => {
    renderWithClient(<CardsView />);

    const newCardBtn = await screen.findByRole('button', { name: /nueva tarjeta/i });
    await userEvent.click(newCardBtn);

    expect(
      screen.getByRole('heading', { name: /nueva tarjeta de crédito/i }),
    ).toBeInTheDocument();
  });

  it('opens CardFormDialog in edition mode when selecting "Editar" from card menu', async () => {
    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const editBtn = screen.getByRole('menuitem', { name: /editar/i });
    await userEvent.click(editBtn);

    expect(
      screen.getByRole('heading', { name: /editar tarjeta de crédito/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Santander Black');
  });

  it('deletes card successfully: calls deleteCard, shows toast and closes confirm dialog', async () => {
    vi.mocked(cardsService.deleteCard).mockResolvedValueOnce(undefined as unknown as void);

    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    // Confirm dialog is open
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/¿eliminar tarjeta\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cardsService.deleteCard).toHaveBeenCalledWith('card-1');
    });

    expect(toast.success).toHaveBeenCalledWith('Tarjeta eliminada exitosamente');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('handles 404 in deletion: shows error toast and closes confirm dialog', async () => {
    vi.mocked(cardsService.deleteCard).mockRejectedValueOnce(
      new ApiError(404, 'Card not found'),
    );

    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cardsService.deleteCard).toHaveBeenCalledWith('card-1');
    });

    expect(toast.error).toHaveBeenCalledWith('El registro ya no existe');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('handles 409 Conflict in deletion: closes DeleteDialog and opens ArchiveCardAlertDialog', async () => {
    vi.mocked(cardsService.deleteCard).mockRejectedValueOnce(
      new ApiError(409, 'Card has associated expenses'),
    );

    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cardsService.deleteCard).toHaveBeenCalledWith('card-1');
    });

    // Delete dialog closed and Archive dialog opened
    expect(
      await screen.findByRole('heading', {
        name: /esta tarjeta tiene compras asociadas/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archivar tarjeta/i })).toBeInTheDocument();
  });

  it('renders EmptyState when current tab has no cards without redirecting to onboarding', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValueOnce([
      {
        ...mockCards[2], // Solo la archivada
      },
    ]);

    // Ver pestaña activa pero no hay activas
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=active') as unknown as ReturnType<typeof useSearchParams>);

    renderWithClient(<CardsView />);

    expect(await screen.findByText('Sin tarjetas activas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear tarjeta/i })).toBeInTheDocument();
  });

  it('opens CardFeesDialog when selecting "Gestionar mantención" from card menu', async () => {
    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const manageFeesBtn = screen.getByRole('menuitem', { name: /gestionar mantención/i });
    await userEvent.click(manageFeesBtn);

    // Debe abrir CardFeesDialog con el título de la tarjeta seleccionada
    expect(
      await screen.findByRole('heading', {
        name: /tarifas mensuales — santander black/i,
      }),
    ).toBeInTheDocument();
  });

  it('closes CardFeesDialog and resets feeCardTarget when closing the dialog', async () => {
    renderWithClient(<CardsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para santander black/i,
    });
    await userEvent.click(menuTrigger);

    const manageFeesBtn = screen.getByRole('menuitem', { name: /gestionar mantención/i });
    await userEvent.click(manageFeesBtn);

    const dialogTitle = await screen.findByRole('heading', {
      name: /tarifas mensuales — santander black/i,
    });
    expect(dialogTitle).toBeInTheDocument();

    // Click en botón "Cerrar" del diálogo
    const closeBtn = screen.getAllByRole('button', { name: /^cerrar$/i })[0];
    await userEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: /tarifas mensuales — santander black/i,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
