import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseScheduleDrawer } from './expense-schedule-drawer';
import { useExpenseSchedule } from '@/hooks/queries/use-expenses';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { ExpenseScheduleResponse } from '@/types/api.types';

vi.mock('@/hooks/queries/use-expenses', () => ({
  useExpenseSchedule: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

const mockScheduleData: ExpenseScheduleResponse = {
  expense_id: '11111111-1111-4111-8111-111111111111',
  description: 'Supermercado Líder',
  card_id: '22222222-2222-4222-8222-222222222222',
  card_name: 'Visa Santander',
  currency: 'CLP',
  total_amount: '120000',
  installments_count: 3,
  schedule: [
    {
      installment_number: 1,
      installments_count: 3,
      installment_label: '1/3',
      statement_period: '2026-10',
      payment_period: '2026-11',
      closing_date: '2026-10-25',
      due_date: '2026-11-10',
      installment_amount: '40000',
      person_shares: [
        {
          person_id: 'p1',
          person_name: 'Anyi Rojas',
          amount: '20000',
        },
        {
          person_id: 'p2',
          person_name: 'Augusto Soto',
          amount: '20000',
        },
      ],
    },
    {
      installment_number: 2,
      installments_count: 3,
      installment_label: '2/3',
      statement_period: '2026-11',
      payment_period: '2026-12',
      closing_date: '2026-11-25',
      due_date: '2026-12-10',
      installment_amount: '40000',
      person_shares: [
        {
          person_id: 'p1',
          person_name: 'Anyi Rojas',
          amount: '20000',
        },
        {
          person_id: 'p2',
          person_name: 'Augusto Soto',
          amount: '20000',
        },
      ],
    },
    {
      installment_number: 3,
      installments_count: 3,
      installment_label: '3/3',
      statement_period: '2026-12',
      payment_period: '2027-01',
      closing_date: '2026-12-25',
      due_date: '2027-01-10',
      installment_amount: '40000',
      person_shares: [
        {
          person_id: 'p1',
          person_name: 'Anyi Rojas',
          amount: '20000',
        },
        {
          person_id: 'p2',
          person_name: 'Augusto Soto',
          amount: '20000',
        },
      ],
    },
  ],
};

describe('ExpenseScheduleDrawer Component (Spec 005 T4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(true); // Desktop mode por defecto
  });

  it('muestra skeleton de carga cuando useExpenseSchedule está cargando', () => {
    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-skeleton')).toBeInTheDocument();
  });

  it('muestra la cabecera completa con datos del gasto y monto total', () => {
    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    // Título y comercio
    expect(screen.getByText(/cronograma de amortización/i)).toBeInTheDocument();
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();

    // Tarjeta y divisa
    expect(screen.getByText('Visa Santander')).toBeInTheDocument();
    expect(screen.getByText('CLP')).toBeInTheDocument();

    // Total y cuotas
    expect(screen.getByText('$120.000')).toBeInTheDocument();
    expect(screen.getByText(/3 cuotas/i)).toBeInTheDocument();
  });

  it('renderiza la tabla con cada cuota oficial, fechas deterministas y desglose por persona', () => {
    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    // Etiquetas de cuota
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();

    // Fechas deterministas (corte y vencimiento de la cuota 1)
    expect(screen.getByText('25 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('10 nov 2026')).toBeInTheDocument();

    // Desglose por persona
    expect(screen.getAllByText(/Anyi Rojas/i).length).toBe(3);
    expect(screen.getAllByText(/Augusto Soto/i).length).toBe(3);
  });

  it('resalta la cuota vigente con badge "Próximo pago" cuando payment_period coincide con activePeriod', () => {
    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
        activePeriod="2026-11"
      />,
    );

    // Solo debe haber un badge de "Próximo pago" para la cuota 1
    const nextPayBadges = screen.getAllByText(/próximo pago/i);
    expect(nextPayBadges).toHaveLength(1);
  });

  it('muestra la nota informativa al pie indicando que los cálculos provienen del backend', () => {
    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/los cronogramas y absorción de residuos de redondeo son calculados y proyectados exclusivamente por el servidor/i),
    ).toBeInTheDocument();
  });

  it('muestra estado de error con botón de reintento si la consulta falla', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no se pudo cargar el cronograma de amortización/i),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('se adapta a vista móvil (< 768px) renderizando Drawer en lugar de Dialog', () => {
    vi.mocked(useMediaQuery).mockReturnValue(false); // Mobile mode

    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleData,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    render(
      <ExpenseScheduleDrawer
        expenseId={mockScheduleData.expense_id}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();
  });
});
