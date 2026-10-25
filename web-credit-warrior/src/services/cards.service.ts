import { apiClient } from './api-client';
import type {
  CardCreate,
  CardUpdate,
  CardRead,
  CardFilters,
  CardMonthlyFeeResponse,
  CardMonthlyFeeCreateOrUpdate,
} from '@/types/api.types';

/**
 * Retrieves list of credit cards with optional active/currency filtering.
 */
export async function listCards(filters?: CardFilters): Promise<CardRead[]> {
  return apiClient.get<CardRead[]>('/api/v1/cards', filters as Record<string, unknown>);
}

/**
 * Retrieves a single credit card by unique identifier.
 */
export async function getCard(id: string): Promise<CardRead> {
  return apiClient.get<CardRead>(`/api/v1/cards/${id}`);
}

/**
 * Creates a new credit card.
 */
export async function createCard(data: CardCreate): Promise<CardRead> {
  return apiClient.post<CardRead>('/api/v1/cards', data);
}

/**
 * Partially updates an existing credit card.
 */
export async function updateCard(id: string, data: CardUpdate): Promise<CardRead> {
  return apiClient.patch<CardRead>(`/api/v1/cards/${id}`, data);
}

/**
 * Deletes a credit card. Returns 204 No Content.
 */
export async function deleteCard(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/cards/${id}`);
}

/**
 * Lists chronological monthly maintenance fee overrides for a card.
 */
export async function listCardFees(cardId: string): Promise<CardMonthlyFeeResponse[]> {
  return apiClient.get<CardMonthlyFeeResponse[]>(`/api/v1/cards/${cardId}/fees`);
}

/**
 * Gets effective maintenance fee for a specific billing period.
 */
export async function getCardFee(cardId: string, period: string): Promise<CardMonthlyFeeResponse> {
  return apiClient.get<CardMonthlyFeeResponse>(`/api/v1/cards/${cardId}/fees/${period}`);
}

/**
 * Sets or updates a monthly maintenance fee override.
 */
export async function setCardFee(
  cardId: string,
  period: string,
  data: CardMonthlyFeeCreateOrUpdate,
): Promise<CardMonthlyFeeResponse> {
  return apiClient.put<CardMonthlyFeeResponse>(`/api/v1/cards/${cardId}/fees/${period}`, data);
}

/**
 * Removes a monthly maintenance fee override, reverting to card default. Returns 204 No Content.
 */
export async function deleteCardFee(cardId: string, period: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/cards/${cardId}/fees/${period}`);
}

export const cardsService = {
  list: listCards,
  getById: getCard,
  create: createCard,
  update: updateCard,
  remove: deleteCard,
  listFees: listCardFees,
  getFee: getCardFee,
  setFee: setCardFee,
  deleteFee: deleteCardFee,
};
