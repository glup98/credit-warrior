import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import {
  ExpenseFiltersBar,
  mapSearchParamsToApiFilters,
} from './expense-filters-bar';
import type { CardRead, PersonRead } from '@/types/api.types';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

const mockCards: CardRead[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Visa Santander',
    last_four_digits: '1234',
    currency: 'CLP',
    is_active: true,
    closing_day: 25,
    due_day: 10,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Mastercard Black',
    last_four_digits: '9876',
    currency: 'USD',
    is_active: true,
    closing_day: 20,
    due_day: 5,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockPersons: PersonRead[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Anyi Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Augusto Soto',
    color_hex: '#8B5CF6',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

describe('ExpenseFiltersBar Component (Spec 005 T3)', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
    } as unknown as ReturnType<typeof useRouter>);

    vi.mocked(usePathname).mockReturnValue('/expenses');

    vi.mocked(useCards).mockReturnValue({
      data: mockCards,
      isLoading: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: mockPersons,
      isLoading: false,
    } as unknown as ReturnType<typeof usePersons>);
  });

  it('renderiza todos los controles de filtro con opciones cargadas y sin botón limpiar cuando no hay filtros', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ExpenseFiltersBar />);

    // Selector de tarjeta
    const cardSelect = screen.getByRole('combobox', { name: /filtrar por tarjeta/i });
    expect(cardSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /todas las tarjetas/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /visa santander/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /mastercard black/i })).toBeInTheDocument();

    // Selector de participante
    const personSelect = screen.getByRole('combobox', { name: /filtrar por participante/i });
    expect(personSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /todos los participantes/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /anyi rojas/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /augusto soto/i })).toBeInTheDocument();

    // Selector de período
    const periodInput = screen.getByLabelText(/filtrar por período/i);
    expect(periodInput).toBeInTheDocument();

    // Campo de búsqueda
    const searchInput = screen.getByRole('searchbox', { name: /buscar compras/i });
    expect(searchInput).toBeInTheDocument();

    // El botón de limpiar no debe aparecer si no hay filtros activos
    expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it('sincroniza en searchParams la selección de tarjeta, participante y período', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ExpenseFiltersBar />);

    // 1. Seleccionar tarjeta
    const cardSelect = screen.getByRole('combobox', { name: /filtrar por tarjeta/i });
    await user.selectOptions(cardSelect, mockCards[0].id);

    expect(mockReplace).toHaveBeenCalledWith(
      `/expenses?card_id=${mockCards[0].id}`,
      { scroll: false },
    );

    // 2. Seleccionar participante
    const personSelect = screen.getByRole('combobox', { name: /filtrar por participante/i });
    await user.selectOptions(personSelect, mockPersons[0].id);

    expect(mockReplace).toHaveBeenCalledWith(
      `/expenses?person_id=${mockPersons[0].id}`,
      { scroll: false },
    );

    // 3. Modificar período
    const periodInput = screen.getByLabelText(/filtrar por período/i);
    await user.type(periodInput, '2026-11');

    expect(mockReplace).toHaveBeenCalledWith(
      '/expenses?period=2026-11',
      { scroll: false },
    );
  });

  it('sincroniza el campo de búsqueda por texto en searchParams con parámetro q', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ExpenseFiltersBar />);

    const searchInput = screen.getByRole('searchbox', { name: /buscar compras/i });
    await user.type(searchInput, 'Líder');

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('q='),
      { scroll: false },
    );
  });

  it('muestra el botón "Limpiar filtros" cuando hay filtros activos y los restablece al pulsarlo', async () => {
    const user = userEvent.setup();
    const initialParams = new URLSearchParams(
      'card_id=11111111-1111-4111-8111-111111111111&period=2026-10&q=super',
    );
    vi.mocked(useSearchParams).mockReturnValue(
      initialParams as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ExpenseFiltersBar />);

    const clearButton = screen.getByRole('button', { name: /limpiar filtros/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(mockReplace).toHaveBeenCalledWith('/expenses', { scroll: false });
  });

  it('elimina el parámetro de la URL si el usuario vuelve a elegir "Todas las tarjetas"', async () => {
    const user = userEvent.setup();
    const activeParams = new URLSearchParams(`card_id=${mockCards[0].id}`);
    vi.mocked(useSearchParams).mockReturnValue(
      activeParams as unknown as ReturnType<typeof useSearchParams>,
    );

    render(<ExpenseFiltersBar />);

    const cardSelect = screen.getByRole('combobox', { name: /filtrar por tarjeta/i });
    await user.selectOptions(cardSelect, '');

    expect(mockReplace).toHaveBeenCalledWith('/expenses', { scroll: false });
  });

  describe('mapSearchParamsToApiFilters utility', () => {
    it('mapea period de searchParams hacia active_in_period para la API y omite q', () => {
      const searchParams = new URLSearchParams({
        card_id: mockCards[0].id,
        person_id: mockPersons[0].id,
        period: '2026-11',
        q: 'Supermercado',
      });

      const apiFilters = mapSearchParamsToApiFilters(searchParams);

      expect(apiFilters).toEqual({
        card_id: mockCards[0].id,
        person_id: mockPersons[0].id,
        active_in_period: '2026-11',
      });
      expect(apiFilters).not.toHaveProperty('q');
      expect(apiFilters).not.toHaveProperty('period');
    });

    it('devuelve campos como undefined cuando no están presentes en searchParams', () => {
      const emptyParams = new URLSearchParams();
      const apiFilters = mapSearchParamsToApiFilters(emptyParams);

      expect(apiFilters).toEqual({
        card_id: undefined,
        person_id: undefined,
        active_in_period: undefined,
      });
    });
  });
});
