import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorPicker, PRESET_COLORS } from './color-picker';
import { PersonItem } from './person-item';
import * as personsService from '@/services/persons.service';
import type { PersonRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/persons.service', () => ({
  updatePerson: vi.fn(),
  deletePerson: vi.fn(),
}));

const mockPersonActive: PersonRead = {
  id: 'person-1',
  name: 'Ana María',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPersonArchived: PersonRead = {
  id: 'person-2',
  name: 'Carlos Ruiz',
  color_hex: null,
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

describe('Person Components (Spec 003 T6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ColorPicker Component', () => {
    it('renders 8 preset color buttons and neutral option button', () => {
      expect(PRESET_COLORS).toHaveLength(8);
      render(<ColorPicker value="#10B981" onChange={vi.fn()} />);

      // Debe renderizar 8 botones de color más 1 botón neutro = 9 botones de radio
      const colorOptions = screen.getAllByRole('radio');
      expect(colorOptions).toHaveLength(9);

      // Botón neutro
      expect(screen.getByRole('radio', { name: /neutro/i })).toBeInTheDocument();
      // El color seleccionado inicialmente tiene aria-checked="true"
      const selectedOption = screen.getByRole('radio', { name: '#10B981' });
      expect(selectedOption).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onChange with selected hex when clicking a color option', async () => {
      const onChange = vi.fn();
      render(<ColorPicker value="#10B981" onChange={onChange} />);

      const skyBlueBtn = screen.getByRole('radio', { name: '#38BDF8' });
      await userEvent.click(skyBlueBtn);

      expect(onChange).toHaveBeenCalledWith('#38BDF8');
    });

    it('calls onChange with null when clicking the neutral option', async () => {
      const onChange = vi.fn();
      render(<ColorPicker value="#10B981" onChange={onChange} />);

      const neutralBtn = screen.getByRole('radio', { name: /neutro/i });
      await userEvent.click(neutralBtn);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('highlights neutral option when value is null or empty', () => {
      render(<ColorPicker value={null} onChange={vi.fn()} />);

      const neutralBtn = screen.getByRole('radio', { name: /neutro/i });
      expect(neutralBtn).toHaveAttribute('aria-checked', 'true');
    });

    it('supports controlled selection state', async () => {
      function ControlledPicker() {
        const [color, setColor] = useState<string | null>('#8B5CF6');
        return <ColorPicker value={color} onChange={setColor} />;
      }

      render(<ControlledPicker />);

      const violetBtn = screen.getByRole('radio', { name: '#8B5CF6' });
      expect(violetBtn).toHaveAttribute('aria-checked', 'true');

      const amberBtn = screen.getByRole('radio', { name: '#F59E0B' });
      await userEvent.click(amberBtn);

      expect(amberBtn).toHaveAttribute('aria-checked', 'true');
      expect(violetBtn).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('PersonItem Component', () => {
    it('renders active person with colored avatar, name and active badge', () => {
      renderWithClient(<PersonItem person={mockPersonActive} />);

      expect(screen.getByText('Ana María')).toBeInTheDocument();
      expect(screen.getByText('AM')).toBeInTheDocument();
      expect(screen.getByText('Activo')).toBeInTheDocument();

      const avatar = screen.getByText('AM');
      expect(avatar).toHaveStyle({ backgroundColor: '#10B981' });
    });

    it('renders archived person with fallback neutral avatar (#8A93A6) and archived badge', () => {
      renderWithClient(<PersonItem person={mockPersonArchived} />);

      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
      expect(screen.getByText('CR')).toBeInTheDocument();
      expect(screen.getByText('Archivado')).toBeInTheDocument();

      const avatar = screen.getByText('CR');
      expect(avatar).toHaveStyle({ backgroundColor: '#8A93A6' });
    });

    it('triggers onEdit callback when clicking edit action from dropdown menu', async () => {
      const onEdit = vi.fn();
      renderWithClient(<PersonItem person={mockPersonActive} onEdit={onEdit} />);

      const menuTrigger = screen.getByRole('button', { name: /acciones para ana maría/i });
      await userEvent.click(menuTrigger);

      const editBtn = screen.getByRole('menuitem', { name: /editar/i });
      await userEvent.click(editBtn);

      expect(onEdit).toHaveBeenCalledWith(mockPersonActive);
    });

    it('toggles active person to archived, calling updatePerson and emitting success toast', async () => {
      vi.mocked(personsService.updatePerson).mockResolvedValueOnce({
        ...mockPersonActive,
        is_active: false,
      });

      renderWithClient(<PersonItem person={mockPersonActive} />);

      const menuTrigger = screen.getByRole('button', { name: /acciones para ana maría/i });
      await userEvent.click(menuTrigger);

      const archiveBtn = screen.getByRole('menuitem', { name: /archivar/i });
      await userEvent.click(archiveBtn);

      await waitFor(() => {
        expect(personsService.updatePerson).toHaveBeenCalledWith('person-1', {
          is_active: false,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Persona archivada exitosamente');
    });

    it('toggles archived person to active, calling updatePerson and emitting success toast', async () => {
      vi.mocked(personsService.updatePerson).mockResolvedValueOnce({
        ...mockPersonArchived,
        is_active: true,
      });

      renderWithClient(<PersonItem person={mockPersonArchived} />);

      const menuTrigger = screen.getByRole('button', { name: /acciones para carlos ruiz/i });
      await userEvent.click(menuTrigger);

      const activateBtn = screen.getByRole('menuitem', { name: /reactivar|activar/i });
      await userEvent.click(activateBtn);

      await waitFor(() => {
        expect(personsService.updatePerson).toHaveBeenCalledWith('person-2', {
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Persona reactivada exitosamente');
    });

    it('triggers onDelete callback when clicking delete action from dropdown menu', async () => {
      const onDelete = vi.fn();
      renderWithClient(<PersonItem person={mockPersonActive} onDelete={onDelete} />);

      const menuTrigger = screen.getByRole('button', { name: /acciones para ana maría/i });
      await userEvent.click(menuTrigger);

      const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
      await userEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledWith(mockPersonActive);
    });
  });
});
