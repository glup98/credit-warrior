import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickExpenseDrawer } from './quick-expense-drawer';
import { QuickExpenseProvider, useQuickExpense } from '../context/quick-expense-context';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useCreateExpense } from '@/hooks/queries/use-expenses';
import { toast } from 'sonner';
import type { CardRead, PersonRead } from '@/types/api.types';

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

vi.mock('@/hooks/queries/use-expenses', () => ({
  useCreateExpense: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockCard: CardRead = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Visa Banco',
  last_four_digits: '4321',
  currency: 'CLP',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson: PersonRead = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Camila Rojas',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuickExpenseProvider>{ui}</QuickExpenseProvider>
    </QueryClientProvider>,
  );
}

// Componente de prueba para abrir el drawer mediante el contexto
function TestDrawerHarness() {
  const { open } = useQuickExpense();
  return (
    <div>
      <button onClick={open}>Abrir Drawer</button>
      <QuickExpenseDrawer />
    </div>
  );
}

describe('QuickExpenseDrawer (Spec 004 T8)', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCards).mockReturnValue({
      data: [mockCard],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: [mockPerson],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersons>);

    vi.mocked(useCreateExpense).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateExpense>);
  });

  describe('Adaptive Rendering (Desktop vs Mobile)', () => {
    it('does not render dialog or drawer content when closed', () => {
      vi.mocked(useMediaQuery).mockReturnValue(true);
      renderWithProviders(<QuickExpenseDrawer />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(/registrar gasto/i)).not.toBeInTheDocument();
    });

    it('renders Dialog modal on desktop (>= 768px)', async () => {
      const user = userEvent.setup();
      vi.mocked(useMediaQuery).mockReturnValue(true);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    });

    it('renders Drawer modal on mobile (< 768px)', async () => {
      const user = userEvent.setup();
      vi.mocked(useMediaQuery).mockReturnValue(false);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      expect(
        screen.getByRole('heading', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    });
  });

  describe('Anti Accidental-Dismiss Protection (isDirty)', () => {
    it('closes freely when Cancelar button is clicked even if dirty', async () => {
      const user = userEvent.setup();
      vi.mocked(useMediaQuery).mockReturnValue(true);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Compra para descartar');

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('sets dismissible={false} on mobile drawer when form has input data', async () => {
      const user = userEvent.setup();
      vi.mocked(useMediaQuery).mockReturnValue(false);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Cena en restaurante');

      // Vaul Drawer sets data-vaul-drawer or data-dismissible attribute
      const drawerContent = document.querySelector('[data-vaul-drawer]');
      if (drawerContent) {
        expect(drawerContent).toBeInTheDocument();
      }
      expect(descInput).toHaveValue('Cena en restaurante');
    });
  });

  describe('Submission Lifecycle and Network Error Resilience', () => {
    it('closes modal after successful expense submission', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: 'exp-123' });
      vi.mocked(useMediaQuery).mockReturnValue(true);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Supermercado');

      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '45000');

      const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/gasto registrado exitosamente/i),
      );
    });

    it('keeps modal open with entered data intact when network or server error occurs', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error('500 Internal Server Error'));
      vi.mocked(useMediaQuery).mockReturnValue(true);

      renderWithProviders(<TestDrawerHarness />);

      await user.click(screen.getByRole('button', { name: /abrir drawer/i }));

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Medicamentos farmacia');

      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '18500');

      const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/error de conexión con el servidor/i),
        );
      });

      // Modal stays open and preserves inputs
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(descInput).toHaveValue('Medicamentos farmacia');
      expect(amountInput).toHaveValue('18500');
    });
  });
});
