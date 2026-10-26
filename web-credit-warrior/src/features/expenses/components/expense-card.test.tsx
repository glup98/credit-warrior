import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExpenseCard } from './expense-card';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

const mockCardCLP: CardRead = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Visa Santander',
  last_four_digits: '1234',
  currency: 'CLP',
  is_active: true,
  closing_day: 25,
  due_day: 10,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockCardUSD: CardRead = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Mastercard Black',
  last_four_digits: '9876',
  currency: 'USD',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson1: PersonRead = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Anyi Rojas',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson2: PersonRead = {
  id: '55555555-5555-4555-8555-555555555555',
  name: 'Augusto Soto',
  color_hex: '#8B5CF6',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockExpenseCLP: ExpenseRead = {
  id: '11111111-1111-4111-8111-111111111111',
  card_id: mockCardCLP.id,
  description: 'Supermercado Líder',
  total_amount: '120000',
  purchase_date: '2026-10-16',
  installments_count: 3,
  first_billing_override: '2026-11',
  notes: 'Compra mensual para la casa',
  created_at: '2026-10-16T10:00:00Z',
  updated_at: '2026-10-16T10:00:00Z',
  splits: [
    {
      id: 's1',
      person_id: mockPerson1.id,
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    },
    {
      id: 's2',
      person_id: mockPerson2.id,
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    },
  ],
};

describe('ExpenseCard Component (Spec 005 T2)', () => {
  it('renderiza la estructura semántica en <article> con aria-labelledby y sin botones anidados', () => {
    const { container } = render(
      <ExpenseCard
        expense={mockExpenseCLP}
        card={mockCardCLP}
        persons={[mockPerson1, mockPerson2]}
      />,
    );

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute(
      'aria-labelledby',
      `expense-title-${mockExpenseCLP.id}`,
    );

    // Verificación estricta de accesibilidad DOM: prohíbe <button> dentro de <button>
    const nestedButtons = container.querySelectorAll('button button');
    expect(nestedButtons.length).toBe(0);
  });

  it('muestra la información principal de la compra: comercio, tarjeta, cuotas, fecha determinista y monto', () => {
    render(
      <ExpenseCard
        expense={mockExpenseCLP}
        card={mockCardCLP}
        persons={[mockPerson1, mockPerson2]}
      />,
    );

    // Descripción del comercio
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();

    // Tarjeta y máscara
    expect(screen.getByText('Visa Santander')).toBeInTheDocument();
    expect(screen.getByText('•••• 1234')).toBeInTheDocument();

    // Divisa
    expect(screen.getByText('CLP')).toBeInTheDocument();

    // Cuotas
    expect(screen.getByText(/3 cuotas/i)).toBeInTheDocument();

    // Fecha determinista en español (sin desfase UTC)
    expect(screen.getByText('16 oct 2026')).toBeInTheDocument();

    // Monto formateado
    expect(screen.getByText('$120.000')).toBeInTheDocument();

    // Chips de participantes
    expect(screen.getByText('Anyi Rojas')).toBeInTheDocument();
    expect(screen.getByText('Augusto Soto')).toBeInTheDocument();
  });

  it('renderiza correctamente compras en USD con cuota única', () => {
    const singleInstallmentUSD: ExpenseRead = {
      ...mockExpenseCLP,
      id: 'usd-expense-1',
      card_id: mockCardUSD.id,
      description: 'Café en Miami',
      total_amount: '4.50',
      purchase_date: '2026-10-20',
      installments_count: 1,
      first_billing_override: null,
      notes: null,
      splits: [
        {
          id: 's1',
          person_id: mockPerson1.id,
          split_type: 'EQUAL',
          percentage: null,
          fixed_amount: null,
        },
      ],
    };

    render(
      <ExpenseCard
        expense={singleInstallmentUSD}
        card={mockCardUSD}
        persons={[mockPerson1]}
      />,
    );

    expect(screen.getByText('Café en Miami')).toBeInTheDocument();
    expect(screen.getByText('Mastercard Black')).toBeInTheDocument();
    expect(screen.getByText('•••• 9876')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText(/1 cuota/i)).toBeInTheDocument();
    expect(screen.getByText('20 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('US$4.50')).toBeInTheDocument();
  });

  it('muestra distintivos de opciones avanzadas para first_billing_override y notas cuando existen', () => {
    render(
      <ExpenseCard
        expense={mockExpenseCLP}
        card={mockCardCLP}
        persons={[mockPerson1, mockPerson2]}
      />,
    );

    // Distintivo de período override
    expect(screen.getByText(/1ra facturación: Nov 2026/i)).toBeInTheDocument();

    // Distintivo o indicador de notas
    expect(screen.getByText(/Compra mensual para la casa/i)).toBeInTheDocument();
  });

  it('no muestra distintivos cuando first_billing_override y notes son nulos', () => {
    const cleanExpense: ExpenseRead = {
      ...mockExpenseCLP,
      id: 'clean-1',
      first_billing_override: null,
      notes: null,
    };

    render(
      <ExpenseCard
        expense={cleanExpense}
        card={mockCardCLP}
        persons={[mockPerson1, mockPerson2]}
      />,
    );

    expect(screen.queryByText(/1ra facturación:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Compra mensual para la casa/i)).not.toBeInTheDocument();
  });

  it('llama a onViewSchedule al pulsar el botón "Ver cronograma"', async () => {
    const user = userEvent.setup();
    const handleViewSchedule = vi.fn();

    render(
      <ExpenseCard
        expense={mockExpenseCLP}
        card={mockCardCLP}
        persons={[mockPerson1, mockPerson2]}
        onViewSchedule={handleViewSchedule}
      />,
    );

    const scheduleBtn = screen.getByRole('button', { name: /ver cronograma/i });
    await user.click(scheduleBtn);

    expect(handleViewSchedule).toHaveBeenCalledTimes(1);
    expect(handleViewSchedule).toHaveBeenCalledWith(mockExpenseCLP);
  });

  it('permite abrir el menú de opciones e invocar onEdit y onDelete de forma independiente con stopPropagation', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleContainerClick = vi.fn();

    render(
      <div onClick={handleContainerClick}>
        <ExpenseCard
          expense={mockExpenseCLP}
          card={mockCardCLP}
          persons={[mockPerson1, mockPerson2]}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>,
    );

    // Botón de menú de opciones
    const trigger = screen.getByRole('button', {
      name: `Acciones para ${mockExpenseCLP.description}`,
    });
    await user.click(trigger);

    // El click en trigger no debe propagarse al contenedor padre
    expect(handleContainerClick).not.toHaveBeenCalled();

    // Seleccionar opción "Editar"
    const editItem = screen.getByRole('menuitem', { name: /editar/i });
    await user.click(editItem);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockExpenseCLP);

    // Abrir de nuevo para "Eliminar"
    await user.click(trigger);
    const deleteItem = screen.getByRole('menuitem', { name: /eliminar/i });
    await user.click(deleteItem);

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(mockExpenseCLP);
  });
});
