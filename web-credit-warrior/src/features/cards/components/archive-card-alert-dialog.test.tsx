import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArchiveCardAlertDialog } from './archive-card-alert-dialog';
import * as cardsService from '@/services/cards.service';
import type { CardRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/cards.service', () => ({
  updateCard: vi.fn(),
}));

const mockCard: CardRead = {
  id: 'card-999',
  name: 'Banco de Chile Signature',
  last_four_digits: '9876',
  currency: 'CLP',
  closing_day: 25,
  due_day: 10,
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ArchiveCardAlertDialog Component (Spec 003 T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with 409 conflict explanation, title and card name when open', () => {
    renderWithClient(
      <ArchiveCardAlertDialog
        open={true}
        onOpenChange={vi.fn()}
        card={mockCard}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /esta tarjeta tiene compras asociadas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/banco de chile signature/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no se puede eliminar definitivamente para preservar la integridad/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archivar tarjeta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('does not render dialog content when open is false', () => {
    renderWithClient(
      <ArchiveCardAlertDialog
        open={false}
        onOpenChange={vi.fn()}
        card={mockCard}
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onOpenChange(false) and does not call updateCard when clicking cancel', async () => {
    const onOpenChange = vi.fn();

    renderWithClient(
      <ArchiveCardAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        card={mockCard}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    await userEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(cardsService.updateCard).not.toHaveBeenCalled();
  });

  it('archives card successfully: calls updateCard({ is_active: false }), emits success toast and closes dialog', async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    vi.mocked(cardsService.updateCard).mockResolvedValueOnce({
      ...mockCard,
      is_active: false,
    });

    renderWithClient(
      <ArchiveCardAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        card={mockCard}
        onSuccess={onSuccess}
      />,
    );

    const archiveBtn = screen.getByRole('button', { name: /archivar tarjeta/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(cardsService.updateCard).toHaveBeenCalledWith('card-999', { is_active: false });
    });

    expect(toast.success).toHaveBeenCalledWith('Tarjeta archivada exitosamente');
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles updateCard failure: emits error toast and keeps dialog open for retry', async () => {
    const onOpenChange = vi.fn();

    vi.mocked(cardsService.updateCard).mockRejectedValueOnce(new Error('Network error'));

    renderWithClient(
      <ArchiveCardAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        card={mockCard}
      />,
    );

    const archiveBtn = screen.getByRole('button', { name: /archivar tarjeta/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(cardsService.updateCard).toHaveBeenCalledWith('card-999', { is_active: false });
    });

    expect(toast.error).toHaveBeenCalledWith('No se pudo archivar la tarjeta. Intenta nuevamente.');
    // The dialog MUST NOT be closed on error
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
