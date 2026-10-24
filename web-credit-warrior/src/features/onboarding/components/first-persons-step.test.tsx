import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FirstPersonsStep } from './first-persons-step';
import * as personsService from '@/services/persons.service';
import { ApiError } from '@/services/api-client';
import type { PersonRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/services/persons.service');

const mockPerson1: PersonRead = {
  id: 'p1111111-1111-1111-1111-111111111111',
  name: 'Anyi',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockPerson2: PersonRead = {
  id: 'p2222222-2222-2222-2222-222222222222',
  name: 'Augusto',
  color_hex: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('FirstPersonsStep component', () => {
  const defaultProps = {
    persons: [],
    onPersonAdded: vi.fn(),
    onPersonDeleted: vi.fn(),
    onReviewCard: vi.fn(),
    onFinish: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders participant name input, color options and neutral option', () => {
    render(<FirstPersonsStep {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/Nombre o apodo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Neutro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Color #10B981/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Color #38BDF8/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar participante/i })).toBeInTheDocument();
  });

  it('creates participant with color_hex: null when neutral option is chosen', async () => {
    const user = userEvent.setup();
    const onPersonAdded = vi.fn();
    vi.mocked(personsService.createPerson).mockResolvedValue(mockPerson2);

    render(<FirstPersonsStep {...defaultProps} onPersonAdded={onPersonAdded} />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/Nombre o apodo/i), 'Augusto');
    await user.click(screen.getByRole('button', { name: /Neutro/i }));
    await user.click(screen.getByRole('button', { name: /Agregar participante/i }));

    await waitFor(() => {
      expect(personsService.createPerson).toHaveBeenCalledWith({
        name: 'Augusto',
        color_hex: null,
        is_active: true,
      });
    });

    expect(onPersonAdded).toHaveBeenCalledWith(mockPerson2);
    expect(toast.success).toHaveBeenCalledWith('Participante agregado');
  });

  it('creates participant with selected custom color', async () => {
    const user = userEvent.setup();
    const onPersonAdded = vi.fn();
    vi.mocked(personsService.createPerson).mockResolvedValue(mockPerson1);

    render(<FirstPersonsStep {...defaultProps} onPersonAdded={onPersonAdded} />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/Nombre o apodo/i), 'Anyi');
    await user.click(screen.getByRole('button', { name: /Color #10B981/i }));
    await user.click(screen.getByRole('button', { name: /Agregar participante/i }));

    await waitFor(() => {
      expect(personsService.createPerson).toHaveBeenCalledWith({
        name: 'Anyi',
        color_hex: '#10B981',
        is_active: true,
      });
    });

    expect(onPersonAdded).toHaveBeenCalledWith(mockPerson1);
  });

  it('maps 409 Conflict error directly to the name field', async () => {
    const user = userEvent.setup();
    const conflictError = new ApiError(409, 'Ya existe una persona registrada con este nombre');
    vi.mocked(personsService.createPerson).mockRejectedValue(conflictError);

    render(<FirstPersonsStep {...defaultProps} />, { wrapper: createWrapper() });

    await user.type(screen.getByLabelText(/Nombre o apodo/i), 'Anyi');
    await user.click(screen.getByRole('button', { name: /Agregar participante/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe una persona registrada con este nombre'),
      ).toBeInTheDocument();
    });
  });

  it('renders participant tray and handles deletion via useDeletePerson', async () => {
    const user = userEvent.setup();
    const onPersonDeleted = vi.fn();
    vi.mocked(personsService.deletePerson).mockResolvedValue(undefined);

    render(
      <FirstPersonsStep
        {...defaultProps}
        persons={[mockPerson1, mockPerson2]}
        onPersonDeleted={onPersonDeleted}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Anyi')).toBeInTheDocument();
    expect(screen.getByText('Augusto')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Eliminar a Anyi/i });
    expect(deleteBtn).toBeInTheDocument();

    await user.click(deleteBtn);

    await waitFor(() => {
      expect(personsService.deletePerson).toHaveBeenCalledWith(mockPerson1.id);
    });

    expect(onPersonDeleted).toHaveBeenCalledWith(mockPerson1.id);
    expect(toast.success).toHaveBeenCalledWith('Participante eliminado');
  });

  it('disables finish button when persons list is empty and enables it when length >= 1', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();

    const { rerender } = render(
      <FirstPersonsStep {...defaultProps} persons={[]} onFinish={onFinish} />,
      { wrapper: createWrapper() },
    );

    const finishBtn = screen.getByRole('button', { name: /Finalizar y ver Dashboard/i });
    expect(finishBtn).toBeDisabled();
    expect(
      screen.getByText(/Agrega al menos 1 participante para continuar/i),
    ).toBeInTheDocument();

    // Rerender with 1 participant
    rerender(
      <FirstPersonsStep {...defaultProps} persons={[mockPerson1]} onFinish={onFinish} />,
    );

    expect(finishBtn).not.toBeDisabled();
    await user.click(finishBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('triggers onReviewCard callback when clicking Revisar tarjeta creada', async () => {
    const user = userEvent.setup();
    const onReviewCard = vi.fn();

    render(<FirstPersonsStep {...defaultProps} onReviewCard={onReviewCard} />, {
      wrapper: createWrapper(),
    });

    const reviewBtn = screen.getByRole('button', { name: /Revisar tarjeta creada/i });
    expect(reviewBtn).toBeInTheDocument();

    await user.click(reviewBtn);
    expect(onReviewCard).toHaveBeenCalledTimes(1);
  });
});
