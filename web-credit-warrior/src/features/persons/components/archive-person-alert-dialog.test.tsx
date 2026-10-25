import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArchivePersonAlertDialog } from './archive-person-alert-dialog';
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
}));

const mockPerson: PersonRead = {
  id: 'person-888',
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

describe('ArchivePersonAlertDialog Component (Spec 003 T7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with 409 conflict explanation, title and person name when open', () => {
    renderWithClient(
      <ArchivePersonAlertDialog
        open={true}
        onOpenChange={vi.fn()}
        person={mockPerson}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /esta persona tiene gastos asociados/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/valentina soto/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no se puede eliminar definitivamente para preservar la integridad/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archivar persona/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('does not render dialog content when open is false', () => {
    renderWithClient(
      <ArchivePersonAlertDialog
        open={false}
        onOpenChange={vi.fn()}
        person={mockPerson}
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onOpenChange(false) and does not call updatePerson when clicking cancel', async () => {
    const onOpenChange = vi.fn();

    renderWithClient(
      <ArchivePersonAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        person={mockPerson}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    await userEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(personsService.updatePerson).not.toHaveBeenCalled();
  });

  it('archives person successfully: calls updatePerson({ is_active: false }), emits success toast and closes dialog', async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    vi.mocked(personsService.updatePerson).mockResolvedValueOnce({
      ...mockPerson,
      is_active: false,
    });

    renderWithClient(
      <ArchivePersonAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        person={mockPerson}
        onSuccess={onSuccess}
      />,
    );

    const archiveBtn = screen.getByRole('button', { name: /archivar persona/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(personsService.updatePerson).toHaveBeenCalledWith('person-888', {
        is_active: false,
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Persona archivada exitosamente');
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles updatePerson failure: emits error toast and keeps dialog open for retry', async () => {
    const onOpenChange = vi.fn();

    vi.mocked(personsService.updatePerson).mockRejectedValueOnce(
      new Error('Server error'),
    );

    renderWithClient(
      <ArchivePersonAlertDialog
        open={true}
        onOpenChange={onOpenChange}
        person={mockPerson}
      />,
    );

    const archiveBtn = screen.getByRole('button', { name: /archivar persona/i });
    await userEvent.click(archiveBtn);

    await waitFor(() => {
      expect(personsService.updatePerson).toHaveBeenCalledWith('person-888', {
        is_active: false,
      });
    });

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo archivar a la persona. Intenta nuevamente.',
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
