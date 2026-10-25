import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  cardsService,
} from '@/services/cards.service';
import type {
  CardCreate,
  CardUpdate,
  CardRead,
  CardFilters,
  CardMonthlyFeeResponse,
  CardMonthlyFeeCreateOrUpdate,
} from '@/types/api.types';

const CARDS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to retrieve filtered or full list of credit cards.
 */
export function useCards(filters?: CardFilters) {
  return useQuery<CardRead[]>({
    queryKey: queryKeys.cards.list(filters),
    queryFn: () => listCards(filters),
    staleTime: CARDS_STALE_TIME,
  });
}

/**
 * Hook to retrieve a single credit card by id.
 */
export function useCard(id: string) {
  return useQuery<CardRead>({
    queryKey: queryKeys.cards.detail(id),
    queryFn: () => getCard(id),
    enabled: Boolean(id),
    staleTime: CARDS_STALE_TIME,
  });
}

/**
 * Mutation hook to create a new credit card with cascade invalidations.
 */
export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CardCreate) => createCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to partially update a credit card with cascade invalidations.
 */
export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CardUpdate }) => updateCard(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to delete a credit card with cascade invalidations.
 */
export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Hook to retrieve all fee overrides configured for a card.
 */
export function useCardFees(cardId: string) {
  return useQuery<CardMonthlyFeeResponse[]>({
    queryKey: queryKeys.cards.fees(cardId),
    queryFn: () => cardsService.listFees(cardId),
    enabled: Boolean(cardId),
    staleTime: CARDS_STALE_TIME,
  });
}

/**
 * Hook to retrieve effective fee (base or override) for a specific card and billing period.
 */
export function useCardFee(cardId: string, period: string) {
  return useQuery<CardMonthlyFeeResponse>({
    queryKey: queryKeys.cards.feeDetail(cardId, period),
    queryFn: () => cardsService.getFee(cardId, period),
    enabled: Boolean(cardId && period),
    staleTime: CARDS_STALE_TIME,
  });
}

/**
 * Mutation hook to set or update a monthly maintenance fee override.
 * Invalidates cards.fees, cards.detail, and dashboard.all in cascade.
 */
export function useSetCardFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      period,
      data,
    }: {
      cardId: string;
      period: string;
      data: CardMonthlyFeeCreateOrUpdate;
    }) => cardsService.setFee(cardId, period, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.fees(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to delete a monthly maintenance fee override, reverting to default card fee.
 * Invalidates cards.fees, cards.detail, and dashboard.all in cascade.
 */
export function useDeleteCardFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, period }: { cardId: string; period: string }) =>
      cardsService.deleteFee(cardId, period),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.fees(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
