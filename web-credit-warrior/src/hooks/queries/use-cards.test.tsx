import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  useCards,
  useCard,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  useCardFees,
  useCardFee,
  useSetCardFee,
  useDeleteCardFee,
} from './use-cards';
import * as cardsServiceModule from '@/services/cards.service';
import { cardsService } from '@/services/cards.service';
import type {
  CardRead,
  CardMonthlyFeeResponse,
  CardMonthlyFeeCreateOrUpdate,
} from '@/types/api.types';

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
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('use-cards query hooks and mutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  describe('Query Keys for Card Fees', () => {
    it('generates correct hierarchical query keys for card maintenance fees', () => {
      expect(queryKeys.cards.fees('card-123')).toEqual(['cards', 'detail', 'card-123', 'fees']);
      expect(queryKeys.cards.feeDetail('card-123', '2026-11')).toEqual([
        'cards',
        'detail',
        'card-123',
        'fees',
        '2026-11',
      ]);
    });
  });

  describe('useCardFees', () => {
    it('fetches and returns the list of fee overrides for a card', async () => {
      const mockFees: CardMonthlyFeeResponse[] = [
        {
          card_id: 'card-1',
          period: '2026-10',
          fee: '4500',
          source: 'OVERRIDE',
        },
        {
          card_id: 'card-1',
          period: '2026-11',
          fee: '0',
          source: 'OVERRIDE',
        },
      ];

      vi.mocked(cardsService.listFees).mockResolvedValueOnce(mockFees);

      const { result } = renderHook(() => useCardFees('card-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(cardsService.listFees).toHaveBeenCalledWith('card-1');
      expect(result.current.data).toEqual(mockFees);
    });

    it('does not execute query if cardId is empty', () => {
      renderHook(() => useCardFees(''), {
        wrapper: createWrapper(queryClient),
      });

      expect(cardsService.listFees).not.toHaveBeenCalled();
    });
  });

  describe('useCardFee', () => {
    it('fetches effective fee for a specific period', async () => {
      const mockFee: CardMonthlyFeeResponse = {
        card_id: 'card-1',
        period: '2026-11',
        fee: '4500',
        source: 'CARD_DEFAULT',
      };

      vi.mocked(cardsService.getFee).mockResolvedValueOnce(mockFee);

      const { result } = renderHook(() => useCardFee('card-1', '2026-11'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(cardsService.getFee).toHaveBeenCalledWith('card-1', '2026-11');
      expect(result.current.data).toEqual(mockFee);
    });

    it('does not execute query if cardId or period is missing', () => {
      renderHook(() => useCardFee('', '2026-11'), {
        wrapper: createWrapper(queryClient),
      });
      renderHook(() => useCardFee('card-1', ''), {
        wrapper: createWrapper(queryClient),
      });

      expect(cardsService.getFee).not.toHaveBeenCalled();
    });
  });

  describe('useSetCardFee', () => {
    it('calls cardsService.setFee and triggers cascade invalidations on success', async () => {
      const mockResponse: CardMonthlyFeeResponse = {
        card_id: 'card-1',
        period: '2026-11',
        fee: '5000',
        source: 'OVERRIDE',
      };

      vi.mocked(cardsService.setFee).mockResolvedValueOnce(mockResponse);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSetCardFee(), {
        wrapper: createWrapper(queryClient),
      });

      const payload: CardMonthlyFeeCreateOrUpdate = { fee: '5000' };
      await result.current.mutateAsync({
        cardId: 'card-1',
        period: '2026-11',
        data: payload,
      });

      expect(cardsService.setFee).toHaveBeenCalledWith('card-1', '2026-11', payload);

      // Cascade invalidations check
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.cards.fees('card-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.cards.detail('card-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.dashboard.all,
      });
    });
  });

  describe('useDeleteCardFee', () => {
    it('calls cardsService.deleteFee and triggers cascade invalidations on success', async () => {
      vi.mocked(cardsService.deleteFee).mockResolvedValueOnce(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteCardFee(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        cardId: 'card-1',
        period: '2026-11',
      });

      expect(cardsService.deleteFee).toHaveBeenCalledWith('card-1', '2026-11');

      // Cascade invalidations check
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.cards.fees('card-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.cards.detail('card-1'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.dashboard.all,
      });
    });
  });

  describe('Existing Card Hooks', () => {
    it('useCards fetches cards list', async () => {
      const mockCards: CardRead[] = [
        {
          id: 'card-1',
          name: 'Visa',
          last_four_digits: '1234',
          currency: 'CLP',
          closing_day: 25,
          due_day: 10,
          default_monthly_fee: '0',
          is_active: true,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
      ];

      vi.mocked(cardsServiceModule.listCards).mockResolvedValueOnce(mockCards);

      const { result } = renderHook(() => useCards(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(cardsServiceModule.listCards).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockCards);
    });

    it('useCard fetches single card by id', async () => {
      const mockCard: CardRead = {
        id: 'card-1',
        name: 'Visa',
        last_four_digits: '1234',
        currency: 'CLP',
        closing_day: 25,
        due_day: 10,
        default_monthly_fee: '0',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      };

      vi.mocked(cardsServiceModule.getCard).mockResolvedValueOnce(mockCard);

      const { result } = renderHook(() => useCard('card-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(cardsServiceModule.getCard).toHaveBeenCalledWith('card-1');
      expect(result.current.data).toEqual(mockCard);
    });

    it('useCreateCard creates card and invalidates cards.all and dashboard.all', async () => {
      const mockCard: CardRead = {
        id: 'card-new',
        name: 'MasterCard',
        last_four_digits: '5678',
        currency: 'USD',
        closing_day: 15,
        due_day: 1,
        default_monthly_fee: '5.00',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      };

      vi.mocked(cardsServiceModule.createCard).mockResolvedValueOnce(mockCard);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateCard(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        name: 'MasterCard',
        currency: 'USD',
        closing_day: 15,
        due_day: 1,
        default_monthly_fee: '5.00',
        is_active: true,
      });

      expect(cardsServiceModule.createCard).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    });

    it('useUpdateCard updates card and invalidates cards.all, card detail and dashboard.all', async () => {
      const mockCard: CardRead = {
        id: 'card-1',
        name: 'Visa Updated',
        last_four_digits: '1234',
        currency: 'CLP',
        closing_day: 25,
        due_day: 10,
        default_monthly_fee: '4500',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-02T00:00:00Z',
      };

      vi.mocked(cardsServiceModule.updateCard).mockResolvedValueOnce(mockCard);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateCard(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        id: 'card-1',
        data: { name: 'Visa Updated', default_monthly_fee: '4500' },
      });

      expect(cardsServiceModule.updateCard).toHaveBeenCalledWith('card-1', {
        name: 'Visa Updated',
        default_monthly_fee: '4500',
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.detail('card-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    });

    it('useDeleteCard deletes card and invalidates cards.all and dashboard.all', async () => {
      vi.mocked(cardsServiceModule.deleteCard).mockResolvedValueOnce(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteCard(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync('card-1');

      expect(cardsServiceModule.deleteCard).toHaveBeenCalledWith('card-1');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    });
  });
});
