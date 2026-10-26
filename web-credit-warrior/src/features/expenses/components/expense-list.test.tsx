import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseList } from './expense-list';
import { QuickExpenseProvider, useQuickExpense } from '../context/quick-expense-context';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

const mockCard: CardRead = {
  id: 'card-1',
  name: 'Visa Banco Santander',
  last_four_digits: '4321',
  currency: 'CLP',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPersons: PersonRead[] = [
  {
    id: 'person-1',
    name: 'Anyi Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-2',
    name: 'Augusto Soto',
    color_hex: '#38BDF8',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockExpenses: ExpenseRead[] = [
  {
    id: 'exp-1',
    card_id: 'card-1',
    description: 'Supermercado Líder',
    total_amount: '120000',
    purchase_date: '2026-10-15',
    installments_count: 3,
    first_billing_override: '2026-11',
    notes: 'Compra mensual de despensa',
    splits: [
      {
        id: 'split-1',
        person_id: 'person-1',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
      {
        id: 'split-2',
        person_id: 'person-2',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-15T12:00:00Z',
    updated_at: '2026-10-15T12:00:00Z',
  },
  {
    id: 'exp-2',
    card_id: 'card-1',
    description: 'Farmacia Cruz Verde',
    total_amount: '35000',
    purchase_date: '2026-10-18',
    installments_count: 1,
    first_billing_override: null,
    notes: null,
    splits: [
      {
        id: 'split-3',
        person_id: 'person-1',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
];

describe('ExpenseList Component (Spec 005 T7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra siluetas animadas (skeletons) estructuradas cuando isLoading es true', () => {
    render(
      <QuickExpenseProvider>
        <ExpenseList
          expenses={[]}
          isLoading={true}
          cards={[mockCard]}
          persons={mockPersons}
        />
      </QuickExpenseProvider>,
    );

    const skeletons = screen.getAllByTestId('expense-skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/no hay compras registradas/i)).not.toBeInTheDocument();
  });

  it('muestra EmptyState global cuando expenses está vacío y isFiltered es false', async () => {
    const user = userEvent.setup();
    const onRegisterExpense = vi.fn();

    render(
      <QuickExpenseProvider>
        <ExpenseList
          expenses={[]}
          isLoading={false}
          isFiltered={false}
          cards={[mockCard]}
          persons={mockPersons}
          onRegisterExpense={onRegisterExpense}
        />
      </QuickExpenseProvider>,
    );

    expect(screen.getByText(/no hay compras registradas/i)).toBeInTheDocument();
    expect(
      screen.getByText(/comienza registrando tu primera compra/i),
    ).toBeInTheDocument();

    const registerBtn = screen.getByRole('button', { name: /registrar gasto/i });
    expect(registerBtn).toBeInTheDocument();

    await user.click(registerBtn);
    expect(onRegisterExpense).toHaveBeenCalledTimes(1);
  });

  it('muestra EmptyState con botón "Limpiar filtros" cuando no hay coincidencias y isFiltered es true', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    render(
      <QuickExpenseProvider>
        <ExpenseList
          expenses={[]}
          isLoading={false}
          isFiltered={true}
          cards={[mockCard]}
          persons={mockPersons}
          onClearFilters={onClearFilters}
        />
      </QuickExpenseProvider>,
    );

    expect(screen.getByText(/no se encontraron compras/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no hay compras que coincidan con los filtros aplicados/i),
    ).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /limpiar filtros/i });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('renderiza la lista de fichas ExpenseCard cuando existen gastos', () => {
    render(
      <QuickExpenseProvider>
        <ExpenseList
          expenses={mockExpenses}
          isLoading={false}
          isFiltered={false}
          cards={[mockCard]}
          persons={mockPersons}
        />
      </QuickExpenseProvider>,
    );

    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();
    expect(screen.getByText('Farmacia Cruz Verde')).toBeInTheDocument();
    expect(screen.getByText('$120.000')).toBeInTheDocument();
    expect(screen.getByText('$35.000')).toBeInTheDocument();
  });

  it('delega eventos de cronograma, edición y eliminación hacia los callbacks proporcionados', async () => {
    const user = userEvent.setup();
    const onViewSchedule = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <QuickExpenseProvider>
        <ExpenseList
          expenses={mockExpenses}
          isLoading={false}
          cards={[mockCard]}
          persons={mockPersons}
          onViewSchedule={onViewSchedule}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </QuickExpenseProvider>,
    );

    // 1. Ver cronograma en la primera tarjeta (3 cuotas)
    const scheduleButtons = screen.getAllByRole('button', { name: /ver cronograma/i });
    await user.click(scheduleButtons[0]);
    expect(onViewSchedule).toHaveBeenCalledWith(mockExpenses[0]);

    // 2. Abrir menú contextual de la primera tarjeta
    const menuButtons = screen.getAllByRole('button', { name: /acciones para/i });
    await user.click(menuButtons[0]);

    // 3. Seleccionar "Editar"
    const editItem = screen.getByRole('menuitem', { name: /editar/i });
    await user.click(editItem);
    expect(onEdit).toHaveBeenCalledWith(mockExpenses[0]);

    // 4. Abrir menú de la segunda tarjeta y seleccionar "Eliminar"
    await user.click(menuButtons[1]);
    const deleteItem = screen.getByRole('menuitem', { name: /eliminar/i });
    await user.click(deleteItem);
    expect(onDelete).toHaveBeenCalledWith(mockExpenses[1]);
  });

  it('invoca context.open() al pulsar "Registrar gasto" en estado vacío global si no se pasa callback explícito', async () => {
    const user = userEvent.setup();

    function ConsumerTest() {
      const { isOpen } = useQuickExpense();
      return (
        <div>
          <span data-testid="is-open-state">{isOpen ? 'open' : 'closed'}</span>
          <ExpenseList expenses={[]} isLoading={false} isFiltered={false} />
        </div>
      );
    }

    render(
      <QuickExpenseProvider>
        <ConsumerTest />
      </QuickExpenseProvider>,
    );

    expect(screen.getByTestId('is-open-state')).toHaveTextContent('closed');

    const registerBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(registerBtn);

    expect(screen.getByTestId('is-open-state')).toHaveTextContent('open');
  });
});
