import { useCallback } from 'react';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';

export interface OnboardingStatus {
  isOnboarded: boolean;
  isLoading: boolean;
  isError: boolean;
  needsOnboarding: boolean;
  activeCardsCount: number;
  activePersonsCount: number;
  hasCards: boolean;
  hasPersons: boolean;
  initialStep: 1 | 2 | 3;
  refetch: () => Promise<void>;
}

export type OnboardingStatusResult = OnboardingStatus;

/**
 * Hook to inspect the initial zero-state requirement of Credit Warrior.
 * Verifies active cards and active persons catalogs in parallel.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const cardsQuery = useCards({ is_active: true });
  const personsQuery = usePersons({ is_active: true });

  const isLoading = cardsQuery.isLoading || personsQuery.isLoading;
  const isError = cardsQuery.isError || personsQuery.isError;
  const activeCardsCount = cardsQuery.data?.length ?? 0;
  const activePersonsCount = personsQuery.data?.length ?? 0;
  const hasCards = activeCardsCount >= 1;
  const hasPersons = activePersonsCount >= 1;
  const isOnboarded = hasCards && hasPersons;
  const needsOnboarding = !isLoading && !isError && !isOnboarded;

  let initialStep: 1 | 2 | 3 = 1;
  if (!hasCards && !hasPersons) {
    initialStep = 1;
  } else if (!hasCards && hasPersons) {
    initialStep = 2;
  } else if (hasCards && !hasPersons) {
    initialStep = 3;
  }

  const refetch = useCallback(async () => {
    await Promise.all([cardsQuery.refetch(), personsQuery.refetch()]);
  }, [cardsQuery, personsQuery]);

  return {
    isOnboarded,
    isLoading,
    isError,
    needsOnboarding,
    activeCardsCount,
    activePersonsCount,
    hasCards,
    hasPersons,
    initialStep,
    refetch,
  };
}
