import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PersonsView } from './persons-view';
import * as personsService from '@/services/persons.service';
import { ApiError } from '@/services/api-client';
import type { PersonRead } from '@/types/api.types';

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

vi.mock('@/services/persons.service', () => ({
  listPersons: vi.fn(),
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
  deletePerson: vi.fn(),
}));

const mockPersons: PersonRead[] = [
  {
    id: 'person-1',
    name: 'Camila Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-2',
    name: 'Valentina Soto',
    color_hex: '#8B5CF6',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-3',
    name: 'Ignacio Silva',
    color_hex: '#F59E0B',
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

describe('PersonsView Component (Spec 003 T9)', () => {
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
    vi.mocked(usePathname).mockReturnValue('/persons');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('status=active') as unknown as ReturnType<typeof useSearchParams>,
    );
    vi.mocked(personsService.listPersons).mockResolvedValue(mockPersons);
  });

  it('renders persons catalog with tabs and memory-calculated counts: Activas (2), Archivadas (1), Todas (3)', async () => {
    renderWithClient(<PersonsView />);

    expect(await screen.findByText('Camila Rojas')).toBeInTheDocument();
    expect(screen.getByText('Valentina Soto')).toBeInTheDocument();
    // En pestaña activa, la persona archivada no debe ser visible
    expect(screen.queryByText('Ignacio Silva')).not.toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /activas \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /archivadas \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /todas \(3\)/i })).toBeInTheDocument();
  });

  it('filters by status from URL search params (e.g. status=archived shows only archived)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('status=archived') as unknown as ReturnType<typeof useSearchParams>,
    );

    renderWithClient(<PersonsView />);

    expect(await screen.findByText('Ignacio Silva')).toBeInTheDocument();
    expect(screen.queryByText('Camila Rojas')).not.toBeInTheDocument();
    expect(screen.queryByText('Valentina Soto')).not.toBeInTheDocument();
  });

  it('updates URL search params when clicking another status tab', async () => {
    renderWithClient(<PersonsView />);

    const archivedTab = await screen.findByRole('tab', { name: /archivadas/i });
    await userEvent.click(archivedTab);

    expect(mockReplace).toHaveBeenCalledWith('/persons?status=archived', { scroll: false });
  });

  it('opens PersonFormDialog in creation mode when clicking "Nueva persona" button', async () => {
    renderWithClient(<PersonsView />);

    const newBtn = await screen.findByRole('button', { name: /nueva persona/i });
    await userEvent.click(newBtn);

    expect(
      screen.getByRole('heading', { name: /nuevo participante/i }),
    ).toBeInTheDocument();
  });

  it('opens PersonFormDialog in edition mode when selecting "Editar" from person menu', async () => {
    renderWithClient(<PersonsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para camila rojas/i,
    });
    await userEvent.click(menuTrigger);

    const editBtn = screen.getByRole('menuitem', { name: /editar/i });
    await userEvent.click(editBtn);

    expect(
      screen.getByRole('heading', { name: /editar participante/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Camila Rojas');
  });

  it('deletes person successfully: calls deletePerson, shows toast and closes confirm dialog', async () => {
    vi.mocked(personsService.deletePerson).mockResolvedValueOnce(undefined as unknown as void);

    renderWithClient(<PersonsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para camila rojas/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    // Confirm dialog is open
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/¿eliminar persona\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(personsService.deletePerson).toHaveBeenCalledWith('person-1');
    });

    expect(toast.success).toHaveBeenCalledWith('Participante eliminado exitosamente');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('handles 404 in deletion: shows error toast and closes confirm dialog', async () => {
    vi.mocked(personsService.deletePerson).mockRejectedValueOnce(
      new ApiError(404, 'Person not found'),
    );

    renderWithClient(<PersonsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para camila rojas/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(personsService.deletePerson).toHaveBeenCalledWith('person-1');
    });

    expect(toast.error).toHaveBeenCalledWith('El registro ya no existe');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('handles 409 Conflict in deletion: closes DeleteDialog and opens ArchivePersonAlertDialog', async () => {
    vi.mocked(personsService.deletePerson).mockRejectedValueOnce(
      new ApiError(409, 'Person has associated expenses'),
    );

    renderWithClient(<PersonsView />);

    const menuTrigger = await screen.findByRole('button', {
      name: /acciones para camila rojas/i,
    });
    await userEvent.click(menuTrigger);

    const deleteBtn = screen.getByRole('menuitem', { name: /eliminar/i });
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /eliminar definitivamente/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(personsService.deletePerson).toHaveBeenCalledWith('person-1');
    });

    // Delete dialog closed and Archive dialog opened
    expect(
      await screen.findByRole('heading', {
        name: /esta persona tiene gastos asociados/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archivar persona/i })).toBeInTheDocument();
  });

  it('renders EmptyState when current tab has no active persons without redirecting to onboarding', async () => {
    vi.mocked(personsService.listPersons).mockResolvedValueOnce([
      {
        ...mockPersons[2], // Solo la archivada
      },
    ]);

    // Ver pestaña activa pero no hay activas
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('status=active') as unknown as ReturnType<typeof useSearchParams>,
    );

    renderWithClient(<PersonsView />);

    expect(await screen.findByText('Sin participantes activos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear participante/i })).toBeInTheDocument();
  });
});
