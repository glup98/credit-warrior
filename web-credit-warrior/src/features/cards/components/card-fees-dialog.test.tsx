import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CardFeesDialog } from './card-fees-dialog';
import * as cardsServiceModule from '@/services/cards.service';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { CardRead, CardMonthlyFeeResponse } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('@/services/cards.service', () => ({
  listCardFees: vi.fn(),
  getCardFee: vi.fn(),
  setCardFee: vi.fn(),
  deleteCardFee: vi.fn(),
  cardsService: {
    listFees: vi.fn(),
    getFee: vi.fn(),
    setFee: vi.fn(),
    deleteFee: vi.fn(),
  },
}));

const mockCardCLP: CardRead = {
  id: 'card-111',
  name: 'Santander WorldMember',
  last_four_digits: '1234',
  currency: 'CLP',
  closing_day: 20,
  due_day: 5,
  default_monthly_fee: '4500',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockCardUSD: CardRead = {
  id: 'card-222',
  name: 'Chase Sapphire',
  last_four_digits: '9876',
  currency: 'USD',
  closing_day: 15,
  due_day: 28,
  default_monthly_fee: '15.00',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
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

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('CardFeesDialog Component (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(true); // Desktop mode por defecto
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);
  });

  it('no renderiza contenido cuando open es false o card es null', () => {
    const { container: c1 } = renderWithClient(
      <CardFeesDialog open={false} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );
    expect(c1.querySelector('[role="dialog"]')).toBeNull();

    const { container: c2 } = renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={null} />,
    );
    expect(c2.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra skeleton de carga mientras se obtienen las tarifas de la tarjeta', async () => {
    // Retrasamos la resolución para observar el estado de carga
    let resolveFees: (value: CardMonthlyFeeResponse[]) => void = () => {};
    const pendingPromise = new Promise<CardMonthlyFeeResponse[]>((resolve) => {
      resolveFees = resolve;
    });
    vi.mocked(cardsServiceModule.cardsService.listFees).mockReturnValue(pendingPromise);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    expect(screen.getByTestId('fees-skeleton')).toBeInTheDocument();

    // Resolvemos la promesa
    resolveFees([]);
    await waitFor(() => {
      expect(screen.queryByTestId('fees-skeleton')).not.toBeInTheDocument();
    });
  });

  it('muestra el encabezado con el nombre de la tarjeta, últimos 4 dígitos y la tarifa base predeterminada', async () => {
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    // Título y datos de la tarjeta
    expect(screen.getByRole('heading', { name: /Santander WorldMember/i })).toBeInTheDocument();
    expect(screen.getByText(/•••• 1234/)).toBeInTheDocument();

    // Banner de tarifa base: $4.500
    await waitFor(() => {
      expect(screen.getByText(/\$4\.500/)).toBeInTheDocument();
      expect(screen.getByText('Tarifa base de la tarjeta')).toBeInTheDocument();
    });
  });

  it('muestra el estado vacío explicativo cuando no existen sobreescrituras registradas', async () => {
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('fees-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/sin sobreescrituras registradas/i)).toBeInTheDocument();
    expect(
      screen.getByText(/se aplicará la tarifa base de la tarjeta en todos los meses/i),
    ).toBeInTheDocument();
  });

  it('renderiza el listado cronológico de sobreescrituras con período formateado, monto y badge OVERRIDE', async () => {
    const mockFees: CardMonthlyFeeResponse[] = [
      {
        card_id: mockCardCLP.id,
        period: '2026-11',
        fee: '0',
        source: 'OVERRIDE',
      },
      {
        card_id: mockCardCLP.id,
        period: '2026-12',
        fee: '2500',
        source: 'OVERRIDE',
      },
    ];
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue(mockFees);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    // Debe mostrar los periodos formateados en español
    await waitFor(() => {
      expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
      expect(screen.getByText('Diciembre 2026')).toBeInTheDocument();
    });

    // Montos formateados
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$2.500')).toBeInTheDocument();

    // Badges de sobreescritura (OVERRIDE)
    const overrideBadges = screen.getAllByTestId('fee-override-badge');
    expect(overrideBadges).toHaveLength(2);

    // Botones de eliminación accesibles
    expect(
      screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /eliminar tarifa de 2026-12/i }),
    ).toBeInTheDocument();
  });

  it('permite guardar una nueva sobreescritura mensual exitosamente con toast', async () => {
    const user = userEvent.setup();
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);
    vi.mocked(cardsServiceModule.cardsService.setFee).mockResolvedValue({
      card_id: mockCardCLP.id,
      period: '2026-11',
      fee: '3000',
      source: 'OVERRIDE',
    });

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/mes de facturación|período/i)).toBeInTheDocument();
    });

    const periodInput = screen.getByLabelText(/mes de facturación|período/i);
    const feeInput = screen.getByLabelText(/tarifa para este mes|monto mensual/i);
    const submitBtn = screen.getByRole('button', { name: /guardar tarifa/i });

    // Ingresar período y monto
    await user.clear(periodInput);
    await user.type(periodInput, '2026-11');

    await user.clear(feeInput);
    await user.type(feeInput, '3000');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.setFee).toHaveBeenCalledWith(
        mockCardCLP.id,
        '2026-11',
        { fee: '3000' },
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Tarifa mensual actualizada');
  });

  it('normaliza campo vacío de tarifa a "0" al guardar', async () => {
    const user = userEvent.setup();
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);
    vi.mocked(cardsServiceModule.cardsService.setFee).mockResolvedValue({
      card_id: mockCardCLP.id,
      period: '2026-11',
      fee: '0',
      source: 'OVERRIDE',
    });

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/mes de facturación|período/i)).toBeInTheDocument();
    });

    const periodInput = screen.getByLabelText(/mes de facturación|período/i);
    const feeInput = screen.getByLabelText(/tarifa para este mes|monto mensual/i);
    const submitBtn = screen.getByRole('button', { name: /guardar tarifa/i });

    await user.clear(periodInput);
    await user.type(periodInput, '2026-11');

    // Dejar vacío
    await user.clear(feeInput);
    await user.click(submitBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.setFee).toHaveBeenCalledWith(
        mockCardCLP.id,
        '2026-11',
        { fee: '0' },
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Tarifa mensual actualizada');
  });

  it('valida monto según divisa: rechaza decimales en tarjeta CLP y muestra mensaje de validación', async () => {
    const user = userEvent.setup();
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/tarifa para este mes|monto mensual/i)).toBeInTheDocument();
    });

    const feeInput = screen.getByLabelText(/tarifa para este mes|monto mensual/i);
    const submitBtn = screen.getByRole('button', { name: /guardar tarifa/i });

    await user.clear(feeInput);
    await user.type(feeInput, '2500.50');
    await user.click(submitBtn);

    // Debe mostrar error de validación sin llamar al servicio
    await waitFor(() => {
      expect(
        screen.getByText(/para clp el monto no debe tener decimales/i),
      ).toBeInTheDocument();
    });
    expect(cardsServiceModule.cardsService.setFee).not.toHaveBeenCalled();
  });

  it('permite decimales válidos en tarjeta USD', async () => {
    const user = userEvent.setup();
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);
    vi.mocked(cardsServiceModule.cardsService.setFee).mockResolvedValue({
      card_id: mockCardUSD.id,
      period: '2026-11',
      fee: '3.50',
      source: 'OVERRIDE',
    });

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardUSD} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/tarifa para este mes|monto mensual/i)).toBeInTheDocument();
    });

    const periodInput = screen.getByLabelText(/mes de facturación|período/i);
    const feeInput = screen.getByLabelText(/tarifa para este mes|monto mensual/i);
    const submitBtn = screen.getByRole('button', { name: /guardar tarifa/i });

    await user.clear(periodInput);
    await user.type(periodInput, '2026-11');

    await user.clear(feeInput);
    await user.type(feeInput, '3.50');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.setFee).toHaveBeenCalledWith(
        mockCardUSD.id,
        '2026-11',
        { fee: '3.50' },
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Tarifa mensual actualizada');
  });

  it('permite eliminar una sobreescritura mensual llamando a deleteFee con toast exitoso', async () => {
    const user = userEvent.setup();
    const mockFees: CardMonthlyFeeResponse[] = [
      {
        card_id: mockCardCLP.id,
        period: '2026-11',
        fee: '0',
        source: 'OVERRIDE',
      },
    ];
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue(mockFees);
    vi.mocked(cardsServiceModule.cardsService.deleteFee).mockResolvedValue(undefined);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i }),
      ).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(cardsServiceModule.cardsService.deleteFee).toHaveBeenCalledWith(
        mockCardCLP.id,
        '2026-11',
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      'Sobreescritura eliminada, se restauró la tarifa base',
    );
  });

  it('muestra toast de error cuando falla el guardado o la eliminación', async () => {
    const user = userEvent.setup();
    const mockFees: CardMonthlyFeeResponse[] = [
      {
        card_id: mockCardCLP.id,
        period: '2026-11',
        fee: '0',
        source: 'OVERRIDE',
      },
    ];
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue(mockFees);
    vi.mocked(cardsServiceModule.cardsService.setFee).mockRejectedValue(new Error('Network error'));
    vi.mocked(cardsServiceModule.cardsService.deleteFee).mockRejectedValue(new Error('Delete error'));

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar tarifa/i })).toBeInTheDocument();
    });

    // Probar fallo en guardado
    const submitBtn = screen.getByRole('button', { name: /guardar tarifa/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar la tarifa mensual');
    });

    // Probar fallo en eliminación
    const deleteBtn = screen.getByRole('button', { name: /eliminar tarifa de 2026-11/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar la tarifa mensual');
    });
  });

  it('renderiza en Drawer cuando isDesktop es false (mobile)', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(false); // Mobile
    vi.mocked(cardsServiceModule.cardsService.listFees).mockResolvedValue([]);

    renderWithClient(
      <CardFeesDialog open={true} onOpenChange={vi.fn()} card={mockCardCLP} />,
    );

    // En Drawer se renderiza con el título y estructura
    expect(screen.getByRole('heading', { name: /Santander WorldMember/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tarifas Mensuales/i })).toBeInTheDocument();
  });
});
