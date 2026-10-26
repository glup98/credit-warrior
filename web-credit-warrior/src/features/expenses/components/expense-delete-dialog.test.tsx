import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExpenseDeleteDialog } from './expense-delete-dialog';
import { useDeleteExpense } from '@/hooks/queries/use-expenses';
import { ApiError } from '@/services/api-client';
import type { ExpenseRead } from '@/types/api.types';

vi.mock('@/hooks/queries/use-expenses', () => ({
  useDeleteExpense: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockExpense: ExpenseRead = {
  id: '11111111-1111-4111-8111-111111111111',
  card_id: '22222222-2222-4222-8222-222222222222',
  description: 'Supermercado Líder',
  total_amount: '120000',
  purchase_date: '2026-10-16',
  installments_count: 3,
  first_billing_override: null,
  notes: null,
  splits: [],
  created_at: '2026-10-16T10:00:00Z',
  updated_at: '2026-10-16T10:00:00Z',
};

function renderDialog(ui: React.ReactElement, queryClient?: QueryClient) {
  const qc =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}

describe('ExpenseDeleteDialog Component (Spec 005 T5)', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDeleteExpense).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteExpense>);
  });

  it('renderiza título explicativo, advertencia de cronograma y botones cuando está abierto', () => {
    renderDialog(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        expense={mockExpense}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('¿Eliminar esta compra?')).toBeInTheDocument();
    expect(
      screen.getByText(/esta acción eliminará permanentemente la compra/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/"Supermercado Líder"/i)).toBeInTheDocument();
    expect(
      screen.getByText(/y su cronograma de cuotas asociado/i),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /eliminar compra/i }),
    ).toBeInTheDocument();
  });

  it('no renderiza contenido cuando open es false o expense es null', () => {
    const { rerender } = renderDialog(
      <ExpenseDeleteDialog
        open={false}
        onOpenChange={vi.fn()}
        expense={mockExpense}
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    rerender(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        expense={null}
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('cierra el diálogo al pulsar Cancelar sin invocar la mutación', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    renderDialog(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={handleOpenChange}
        expense={mockExpense}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('elimina la compra exitosamente: llama a mutateAsync, emite toast de éxito y cierra el diálogo', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    renderDialog(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={handleOpenChange}
        expense={mockExpense}
        onSuccess={handleSuccess}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /eliminar compra/i });
    await user.click(deleteBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(mockExpense.id);
    expect(toast.success).toHaveBeenCalledWith('Compra eliminada exitosamente');
    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('tolera concurrencia ante error 404 Not Found: emite toast informativo, invalida consultas y cierra el modal', async () => {
    const user = userEvent.setup();
    const notFoundError = new ApiError(404, 'Expense not found');
    mockMutateAsync.mockRejectedValueOnce(notFoundError);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();

    renderDialog(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={handleOpenChange}
        expense={mockExpense}
        onSuccess={handleSuccess}
      />,
      queryClient,
    );

    const deleteBtn = screen.getByRole('button', { name: /eliminar compra/i });
    await user.click(deleteBtn);

    expect(toast.info).toHaveBeenCalledWith('La compra seleccionada ya no existe');
    expect(invalidateSpy).toHaveBeenCalled();
    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('maneja errores genéricos de red: emite toast de error y mantiene el diálogo abierto para reintento', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
    const handleOpenChange = vi.fn();

    renderDialog(
      <ExpenseDeleteDialog
        open={true}
        onOpenChange={handleOpenChange}
        expense={mockExpense}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /eliminar compra/i });
    await user.click(deleteBtn);

    expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar la compra');
    expect(handleOpenChange).not.toHaveBeenCalledWith(false);
  });
});
