import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardItem } from './card-item';
import { DeleteCardConfirmDialog } from './delete-card-confirm-dialog';
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
  deleteCard: vi.fn(),
}));

const mockCardActive: CardRead = {
  id: 'card-123',
  name: 'Santander Black',
  last_four_digits: '4567',
  currency: 'CLP',
  closing_day: 20,
  due_day: 5,
  default_monthly_fee: '4500',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockCardArchived: CardRead = {
  id: 'card-456',
  name: 'Chase Sapphire',
  last_four_digits: null,
  currency: 'USD',
  closing_day: 15,
  due_day: 28,
  default_monthly_fee: '0',
  is_active: false,
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

describe('CardItem Component (Spec 003 & Spec 009 T4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active card details: name, masked digits, currency, cut/due days and active badge', () => {
    renderWithClient(<CardItem card={mockCardActive} />);

    expect(screen.getByText('Santander Black')).toBeInTheDocument();
    expect(screen.getByText('•••• 4567')).toBeInTheDocument();
    expect(screen.getByText('CLP')).toBeInTheDocument();
    expect(screen.getByText(/cierre: día 20/i)).toBeInTheDocument();
    expect(screen.getByText(/vencimiento: día 5/i)).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('renders archived card details without masked digits when last_four_digits is null', () => {
    renderWithClient(<CardItem card={mockCardArchived} />);

    expect(screen.getByText('Chase Sapphire')).toBeInTheDocument();
    expect(screen.queryByText(/••••/)).not.toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText(/cierre: día 15/i)).toBeInTheDocument();
    expect(screen.getByText(/vencimiento: día 28/i)).toBeInTheDocument();
    expect(screen.getByText('Archivada')).toBeInTheDocument();
  });

  it('displays formatted base maintenance fee $4.500/mes when default_monthly_fee > 0 in CLP', () => {
    renderWithClient(<CardItem card={mockCardActive} />);

    expect(screen.getByText('$4.500/mes')).toBeInTheDocument();
  });

  it('displays neutral $0/mes when default_monthly_fee is 0 for CLP and US$0.00/mes for USD', () => {
    const cardCLPZero: CardRead = {
      ...mockCardActive,
      default_monthly_fee: '0',
    };
    const { unmount } = renderWithClient(<CardItem card={cardCLPZero} />);
    expect(screen.getByText('$0/mes')).toBeInTheDocument();
    unmount();

    renderWithClient(<CardItem card={mockCardArchived} />);
    expect(screen.getByText('US$0.00/mes')).toBeInTheDocument();
  });

  it('displays US$5.00/mes when default_monthly_fee is 5.00 in USD', () => {
    const cardUSDWithFee: CardRead = {
      ...mockCardArchived,
      default_monthly_fee: '5.00',
    };
    renderWithClient(<CardItem card={cardUSDWithFee} />);

    expect(screen.getByText('US$5.00/mes')).toBeInTheDocument();
  });

  it('triggers onManageFees callback when clicking gestionar mantención action from dropdown menu', async () => {
    const onManageFees = vi.fn();
    renderWithClient(<CardItem card={mockCardActive} onManageFees={onManageFees} />);

    const menuTrigger = screen.getByRole('button', { name: /acciones para santander black/i });
    await userEvent.click(menuTrigger);

    const manageFeesBtn = screen.getByRole('menuitem', { name: /gestionar mantención/i });
    await userEvent.click(manageFeesBtn);

    expect(onManageFees).toHaveBeenCalledWith(mockCardActive);
  });

  it('triggers onEdit callback when clicking edit action from dropdown menu', async () => {
    const onEdit = vi.fn();
    renderWithClient(<CardItem card={mockCardActive} onEdit={onEdit} />);

    const menuTrigger = screen.getByRole('button', { name: /acciones para santander black/i });
    await userEvent.click(menuTrigger);

    const editBtn = screen.getByRole('menuitem', { name: /editar/i });
    await userEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledWith(mockCardActive);
  });

  it('toggles active card to archived, calling updateCard service and showing success toast', async () => {
    vi.mocked(cardsService.updateCard).mockResolvedValueOnce({
      ...mockCardActive,
      is_active: false,
    });

    renderWithClient(<CardItem card={mockCardActive} />);

    const menuTrigger = screen.getByRole('button', { name: /acciones para santander black/i });
    await userEvent.click(menuTrigger);

    const archiveBtn = screen.getByRole('menuitem', { name: /archivar/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(cardsService.updateCard).toHaveBeenCalledWith('card-123', { is_active: false });
    });

    expect(toast.success).toHaveBeenCalledWith('Tarjeta archivada exitosamente');
  });

  it('toggles archived card to active, calling updateCard service and showing success toast', async () => {
    vi.mocked(cardsService.updateCard).mockResolvedValueOnce({
      ...mockCardArchived,
      is_active: true,
    });

    renderWithClient(<CardItem card={mockCardArchived} />);

    const menuTrigger = screen.getByRole('button', { name: /acciones para chase sapphire/i });
    await userEvent.click(menuTrigger);

    const activateBtn = screen.getByRole('menuitem', { name: /reactivar|activar/i });
    await userEvent.click(activateBtn);

    await waitFor(() => {
      expect(cardsService.updateCard).toHaveBeenCalledWith('card-456', { is_active: true });
    });

    expect(toast.success).toHaveBeenCalledWith('Tarjeta reactivada exitosamente');
  });

  it('triggers onDelete callback when clicking delete action from dropdown menu', async () => {
    const onDelete = vi.fn();
    renderWithClient(<CardItem card={mockCardActive} onDelete={onDelete} />);

    const menuTrigger = screen.getByRole('button', { name: /acciones para santander black/i });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith(mockCardActive);
  });
});

describe('DeleteCardConfirmDialog Component', () => {
  it('renders confirmation dialog with card name and calls onConfirm when clicking confirm', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeleteCardConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        card={mockCardActive}
        onConfirm={onConfirm}
        isDeleting={false}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/¿eliminar tarjeta\?/i)).toBeInTheDocument();
    expect(screen.getByText(/santander black/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables action button when isDeleting is true', () => {
    render(
      <DeleteCardConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        card={mockCardActive}
        onConfirm={vi.fn()}
        isDeleting={true}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /eliminando\.\.\.|eliminar definitivamente/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onOpenChange(false) when clicking cancel button', async () => {
    const onOpenChange = vi.fn();

    render(
      <DeleteCardConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        card={mockCardActive}
        onConfirm={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    await userEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
