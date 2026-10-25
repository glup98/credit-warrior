import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonFormDialog } from './person-form-dialog';
import * as personsService from '@/services/persons.service';
import { ApiError } from '@/services/api-client';
import type { PersonRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/persons.service', () => ({
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
}));

const mockPersonForEdit: PersonRead = {
  id: 'person-123',
  name: 'Valentina Soto',
  color_hex: '#8B5CF6',
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

describe('PersonFormDialog Component (Spec 003 T8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creation Mode', () => {
    it('renders with title "Nuevo Participante" and default empty fields', () => {
      renderWithClient(
        <PersonFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      expect(
        screen.getByRole('heading', { name: /nuevo participante/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('');
      expect(
        screen.getByRole('radio', { name: /neutro \(sin color\)/i }),
      ).toHaveAttribute('aria-checked', 'true');
      expect(
        screen.getByRole('switch', { name: /participante activo/i }),
      ).toHaveAttribute('aria-checked', 'true');
    });

    it('submits valid new person and calls createPerson with selected color', async () => {
      const onOpenChange = vi.fn();
      const onSuccess = vi.fn();

      vi.mocked(personsService.createPerson).mockResolvedValueOnce({
        id: 'new-person-id',
        name: 'Camila Rojas',
        color_hex: '#10B981',
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Camila Rojas');
      // Seleccionar color verde #10B981
      await userEvent.click(screen.getByRole('radio', { name: '#10B981' }));

      const submitBtn = screen.getByRole('button', { name: /crear participante/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(personsService.createPerson).toHaveBeenCalledWith({
          name: 'Camila Rojas',
          color_hex: '#10B981',
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Participante registrado exitosamente');
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('submits valid new person with neutral color (null)', async () => {
      const onOpenChange = vi.fn();

      vi.mocked(personsService.createPerson).mockResolvedValueOnce({
        id: 'new-person-id',
        name: 'Roberto Gómez',
        color_hex: null,
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={onOpenChange}
        />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Roberto Gómez');
      // Dejar el color neutro por defecto
      const submitBtn = screen.getByRole('button', { name: /crear participante/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(personsService.createPerson).toHaveBeenCalledWith({
          name: 'Roberto Gómez',
          color_hex: null,
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Participante registrado exitosamente');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('validates client-side constraints (name required)', async () => {
      renderWithClient(
        <PersonFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      // Intentar enviar con campo vacío
      await userEvent.click(screen.getByRole('button', { name: /crear participante/i }));

      expect(
        await screen.findByText(/el nombre del participante es obligatorio/i),
      ).toBeInTheDocument();
      expect(personsService.createPerson).not.toHaveBeenCalled();
    });
  });

  describe('Edition Mode', () => {
    it('renders with title "Editar Participante" and pre-populates existing person data', () => {
      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={vi.fn()}
          person={mockPersonForEdit}
        />,
      );

      expect(
        screen.getByRole('heading', { name: /editar participante/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Valentina Soto');
      expect(
        screen.getByRole('radio', { name: '#8B5CF6' }),
      ).toHaveAttribute('aria-checked', 'true');
      expect(
        screen.getByRole('switch', { name: /participante activo/i }),
      ).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
    });

    it('submits updated person data calling updatePerson service', async () => {
      const onOpenChange = vi.fn();
      const onSuccess = vi.fn();

      vi.mocked(personsService.updatePerson).mockResolvedValueOnce({
        ...mockPersonForEdit,
        name: 'Valentina Soto Modificada',
        color_hex: '#38BDF8',
      });

      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={onOpenChange}
          person={mockPersonForEdit}
          onSuccess={onSuccess}
        />,
      );

      const nameInput = screen.getByLabelText(/nombre/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Valentina Soto Modificada');

      // Cambiar color a #38BDF8
      await userEvent.click(screen.getByRole('radio', { name: '#38BDF8' }));

      const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(personsService.updatePerson).toHaveBeenCalledWith('person-123', {
          name: 'Valentina Soto Modificada',
          color_hex: '#38BDF8',
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Participante actualizado exitosamente');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('409 Conflict Handling (Duplicate Name)', () => {
    it('captures 409 Conflict on create, displays inline error under name and keeps selected color', async () => {
      const onOpenChange = vi.fn();
      const conflictError = new ApiError(409, 'A person with this name already exists');

      vi.mocked(personsService.createPerson).mockRejectedValueOnce(conflictError);

      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={onOpenChange}
        />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Nombre Duplicado');
      await userEvent.click(screen.getByRole('radio', { name: '#F59E0B' }));

      await userEvent.click(screen.getByRole('button', { name: /crear participante/i }));

      // Error inline debe aparecer bajo el campo name
      expect(
        await screen.findByText('Ya existe una persona registrada con este nombre'),
      ).toBeInTheDocument();

      // El diálogo no se cierra
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      // El color seleccionado permanece
      expect(
        screen.getByRole('radio', { name: '#F59E0B' }),
      ).toHaveAttribute('aria-checked', 'true');
    });

    it('captures 409 Conflict on update and displays inline error under name', async () => {
      const onOpenChange = vi.fn();
      const conflictError = new ApiError(409, 'A person with this name already exists');

      vi.mocked(personsService.updatePerson).mockRejectedValueOnce(conflictError);

      renderWithClient(
        <PersonFormDialog
          open={true}
          onOpenChange={onOpenChange}
          person={mockPersonForEdit}
        />,
      );

      const nameInput = screen.getByLabelText(/nombre/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Nombre En Conflicto');

      await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

      expect(
        await screen.findByText('Ya existe una persona registrada con este nombre'),
      ).toBeInTheDocument();

      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('Server Validation Handling (422 Unprocessable Entity)', () => {
    it('maps 422 validation errors to corresponding form fields using mapPydanticErrorsToForm', async () => {
      const error422 = new ApiError(422, [
        {
          loc: ['body', 'name'],
          msg: 'El nombre contiene caracteres inválidos',
          type: 'value_error',
        },
      ]);

      vi.mocked(personsService.createPerson).mockRejectedValueOnce(error422);

      renderWithClient(
        <PersonFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Test');
      await userEvent.click(screen.getByRole('button', { name: /crear participante/i }));

      expect(
        await screen.findByText('El nombre contiene caracteres inválidos'),
      ).toBeInTheDocument();
    });
  });

  describe('Cancellation', () => {
    it('closes dialog when cancel button is clicked without submitting', async () => {
      const onOpenChange = vi.fn();
      renderWithClient(
        <PersonFormDialog open={true} onOpenChange={onOpenChange} />,
      );

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      await userEvent.click(cancelBtn);

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(personsService.createPerson).not.toHaveBeenCalled();
    });
  });
});
