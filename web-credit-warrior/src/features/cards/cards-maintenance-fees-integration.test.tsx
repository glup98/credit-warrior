import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { CardsView } from './cards-view';
import { CardFormDialog } from './components/card-form-dialog';
import { CardFeesDialog } from './components/card-fees-dialog';
import { CardBreakdownSection } from '@/features/dashboard/components/card-breakdown-section';
import * as cardsServiceModule from '@/services/cards.service';
import { useMediaQuery } from '@/hooks/use-media-query';
import type {
  CardRead,
  CardMonthlyFeeResponse,
  CardMonthlySummary,
} from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('@/services/cards.service', () => ({
  listCards: vi.fn(),
  getCard: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  listCardFees: vi.fn(),
  getCardFee: vi.fn(),
  setCardFee: vi.fn(),
  deleteCardFee: vi.fn(),
  cardsService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listFees: vi.fn(),
    getFee: vi.fn(),
    setFee: vi.fn(),
    deleteFee: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement, client?: QueryClient) {
  const queryClient = client ?? createTestQueryClient();
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('Spec 009 E2E Integration Suite: Card Maintenance Fees (T8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(true); // Desktop mode
    vi.mocked(usePathname).mockReturnValue('/cards');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('status=active') as unknown as ReturnType<typeof useSearchParams>,
    );
    vi.mocked(useRouter).mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it('Flujo 1 (Creación y Catálogo): Crea tarjeta con mantención base $4.500 y la expone en el catálogo con "$4.500/mes"', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    const createdCard: CardRead = {
      id: 'card-worldmember',
      name: 'Santander WorldMember',
      last_four_digits: '4321',
      currency: 'CLP',
      closing_day: 20,
      due_day: 5,
      default_monthly_fee: '4500',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    vi.mocked(cardsServiceModule.createCard).mockResolvedValue(createdCard);
    vi.mocked(cardsServiceModule.cardsService.create).mockResolvedValue(createdCard);
    vi.mocked(cardsServiceModule.listCards).mockResolvedValue([createdCard]);
    vi.mocked(cardsServiceModule.cardsService.list).mockResolvedValue([createdCard]);

    // 1.1 Renderizar diálogo de creación
    const onOpenChange = vi.fn();
    const { unmount } = renderWithClient(
      <CardFormDialog open={true} onOpenChange={onOpenChange} />,
      queryClient,
    );

    // 1.2 Llenar formulario
    await user.type(screen.getByLabelText(/nombre de la tarjeta/i), 'Santander WorldMember');
    await user.type(screen.getByLabelText(/últimos 4 dígitos/i), '4321');
    await user.type(screen.getByLabelText(/día de corte/i), '20');
    await user.type(screen.getByLabelText(/día de pago/i), '5');

    const feeInput = screen.getByLabelText(/mantención mensual base/i);
    await user.clear(feeInput);
    await user.type(feeInput, '4500');

    await user.click(screen.getByRole('button', { name: /crear tarjeta/i }));

    await waitFor(() => {
      expect(cardsServiceModule.createCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Santander WorldMember',
          default_monthly_fee: '4500',
        }),
      );
    });

    unmount();

    // 1.3 Renderizar vista principal de tarjetas y verificar que expone el costo base
    renderWithClient(<CardsView />, queryClient);

    expect(await screen.findByText('Santander WorldMember')).toBeInTheDocument();
    expect(screen.getByText('•••• 4321')).toBeInTheDocument();
    expect(screen.getByText('$4.500/mes')).toBeInTheDocument();
  });

  it('Flujo 2 (Sobreescritura Mensual): Abre CardFeesDialog, guarda tarifa promocional $0 para 2026-11 vía PUT y la muestra con badge OVERRIDE', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    const mockCard: CardRead = {
      id: 'card-worldmember',
      name: 'Santander WorldMember',
      last_four_digits: '4321',
      currency: 'CLP',
      closing_day: 20,
      due_day: 5,
      default_monthly_fee: '4500',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    let currentFees: CardMonthlyFeeResponse[] = [];
    vi.mocked(cardsServiceModule.cardsService.listFees).mockImplementation(async () => currentFees);

    vi.mocked(cardsServiceModule.cardsService.setFee).mockImplementation(
      async (cardId, period, data) => {
        const newFee: CardMonthlyFeeResponse = {
          card_id: cardId,
          period,
          fee: data.fee,
          source: 'OVERRIDE',
        };
        currentFees = [newFee];
        return newFee;
      },
    );

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCard} />,
      queryClient,
    );

    // Verificar banner de tarifa base
    await waitFor(() => {
      expect(screen.getByText('Tarifa base de la tarjeta')).toBeInTheDocument();
      expect(screen.getByText(/\$4\.500/)).toBeInTheDocument();
    });

    // Esperar a que se resuelva la consulta y aparezca el estado vacío inicial
    expect(await screen.findByTestId('fees-empty-state')).toBeInTheDocument();

    // Ingresar período 2026-11 y tarifa promocional 0
    const periodInput = screen.getByLabelText(/mes de facturación/i);
    const feeInput = screen.getByLabelText(/tarifa para este mes/i);
    const saveBtn = screen.getByRole('button', { name: /guardar tarifa/i });

    await user.clear(periodInput);
    await user.type(periodInput, '2026-11');

    await user.clear(feeInput);
    await user.type(feeInput, '0');

    await user.click(saveBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.setFee).toHaveBeenCalledWith(
        'card-worldmember',
        '2026-11',
        { fee: '0' },
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Tarifa mensual actualizada');

    // Verificar que aparece en el listado con período "Noviembre 2026", monto "$0" y badge de sobreescritura
    await waitFor(() => {
      expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByTestId('fee-override-badge')).toBeInTheDocument();
    });
  });

  it('Flujo 3 (Transparencia en Dashboard): Refleja tarifa $0 en 2026-11, tarifa base $4.500 en 2026-12 y regla de inactividad ($0)', () => {
    const cardsMap = new Map<string, CardRead>([
      [
        'card-worldmember',
        {
          id: 'card-worldmember',
          name: 'Santander WorldMember',
          last_four_digits: '4321',
          currency: 'CLP',
          closing_day: 20,
          due_day: 5,
          default_monthly_fee: '4500',
          is_active: true,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
      ],
      [
        'card-inactive',
        {
          id: 'card-inactive',
          name: 'Banco Edwards',
          last_four_digits: '8888',
          currency: 'CLP',
          closing_day: 15,
          due_day: 1,
          default_monthly_fee: '3500',
          is_active: true,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
      ],
    ]);

    // Caso A: Período 2026-11 con sobreescritura promocional $0
    const summary202611: CardMonthlySummary = {
      card_id: 'card-worldmember',
      card_name: 'Santander WorldMember',
      currency: 'CLP',
      closing_date: '2026-11-20',
      due_date: '2026-12-05',
      purchases_total: '120000',
      maintenance_fee: '0',
      total_due: '120000',
      by_person: [
        {
          person_id: 'p-1',
          person_name: 'Anyi Rojas',
          purchases_amount: '60000',
          fee_share: '0',
          amount_due: '60000',
        },
        {
          person_id: 'p-2',
          person_name: 'Augusto Soto',
          purchases_amount: '60000',
          fee_share: '0',
          amount_due: '60000',
        },
      ],
    };

    const { unmount: unmountA } = render(
      <CardBreakdownSection byCard={[summary202611]} cardsMap={cardsMap} />,
    );

    // Transparencia contable con mantención $0
    expect(screen.getByText('Compras del mes')).toBeInTheDocument();
    expect(screen.getAllByText('$120.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mantención mensual')).toBeInTheDocument();
    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total a pagar en estado de cuenta')).toBeInTheDocument();

    // Desglose por persona: Anyi y Augusto
    expect(screen.getByText('Anyi Rojas')).toBeInTheDocument();
    expect(screen.getByText('Augusto Soto')).toBeInTheDocument();

    unmountA();

    // Caso B: Período 2026-12 con tarifa base aplicada ($4.500) y reparto $1/M
    const summary202612: CardMonthlySummary = {
      card_id: 'card-worldmember',
      card_name: 'Santander WorldMember',
      currency: 'CLP',
      closing_date: '2026-12-20',
      due_date: '2027-01-05',
      purchases_total: '100000',
      maintenance_fee: '4500',
      total_due: '104500',
      by_person: [
        {
          person_id: 'p-1',
          person_name: 'Anyi Rojas',
          purchases_amount: '50000',
          fee_share: '2250',
          amount_due: '52250',
        },
        {
          person_id: 'p-2',
          person_name: 'Augusto Soto',
          purchases_amount: '50000',
          fee_share: '2250',
          amount_due: '52250',
        },
      ],
    };

    const { unmount: unmountB } = render(
      <CardBreakdownSection byCard={[summary202612]} cardsMap={cardsMap} />,
    );

    expect(screen.getByText('$100.000')).toBeInTheDocument();
    expect(screen.getByText('$4.500')).toBeInTheDocument();
    expect(screen.getByText('$104.500')).toBeInTheDocument();

    // Participantes con cuota de mantención $2.250
    const feeShares2250 = screen.getAllByText('$2.250');
    expect(feeShares2250).toHaveLength(2);
    expect(screen.getAllByText('$52.250')).toHaveLength(2);

    unmountB();

    // Caso C: Tarjeta inactiva sin compras (purchases_total: "0")
    const inactiveSummary: CardMonthlySummary = {
      card_id: 'card-inactive',
      card_name: 'Banco Edwards',
      currency: 'CLP',
      closing_date: '2026-11-15',
      due_date: '2026-12-01',
      purchases_total: '0',
      maintenance_fee: '0',
      total_due: '0',
      by_person: [],
    };

    render(<CardBreakdownSection byCard={[inactiveSummary]} cardsMap={cardsMap} />);

    expect(screen.getByText('Banco Edwards')).toBeInTheDocument();
    expect(screen.getByText(/sin mantención por inactividad/i)).toBeInTheDocument();
  });

  it('Flujo 4 (Eliminación de Sobreescritura): Elimina tarifa de 2026-11 vía DELETE y restaura la tarifa base con toast', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    const mockCard: CardRead = {
      id: 'card-worldmember',
      name: 'Santander WorldMember',
      last_four_digits: '4321',
      currency: 'CLP',
      closing_day: 20,
      due_day: 5,
      default_monthly_fee: '4500',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    let feesList: CardMonthlyFeeResponse[] = [
      {
        card_id: mockCard.id,
        period: '2026-11',
        fee: '0',
        source: 'OVERRIDE',
      },
    ];

    vi.mocked(cardsServiceModule.cardsService.listFees).mockImplementation(async () => feesList);
    vi.mocked(cardsServiceModule.cardsService.deleteFee).mockImplementation(
      async () => {
        feesList = [];
      },
    );

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCard} />,
      queryClient,
    );

    // Esperar a que se cargue la sobreescritura
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i }),
      ).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.deleteFee).toHaveBeenCalledWith(
        mockCard.id,
        '2026-11',
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Sobreescritura eliminada, se restauró la tarifa base',
    );
  });
});
