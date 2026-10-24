import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingStatus } from './use-onboarding-status';
import * as cardsService from '@/services/cards.service';
import * as personsService from '@/services/persons.service';
import type { CardRead, PersonRead } from '@/types/api.types';

vi.mock('@/services/cards.service');
vi.mock('@/services/persons.service');

const mockCard: CardRead = {
  id: 'c1111111-1111-1111-1111-111111111111',
  name: 'Visa Gold',
  closing_day: 20,
  due_day: 5,
  currency: 'CLP',
  last_four_digits: '1234',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockPerson: PersonRead = {
  id: 'p1111111-1111-1111-1111-111111111111',
  name: 'Ana',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useOnboardingStatus hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('indicates loading state while queries are resolving', async () => {
    vi.mocked(cardsService.listCards).mockImplementation(
      () => new Promise(() => {}),
    );
    vi.mocked(personsService.listPersons).mockResolvedValue([]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.needsOnboarding).toBe(false);
  });

  it('handles error state on cards failure and executes refetch without triggering onboarding loop', async () => {
    vi.mocked(cardsService.listCards).mockRejectedValue(new Error('Network error'));
    vi.mocked(personsService.listPersons).mockResolvedValue([mockPerson]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.needsOnboarding).toBe(false);

    // Test refetch
    vi.mocked(cardsService.listCards).mockResolvedValue([mockCard]);
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });
    expect(result.current.isOnboarded).toBe(true);
  });

  it('handles error state on persons failure', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValue([mockCard]);
    vi.mocked(personsService.listPersons).mockRejectedValue(new Error('500 Internal Error'));

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.needsOnboarding).toBe(false);
  });

  it('returns needsOnboarding: true and initialStep: 1 when both catalogs are empty', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValue([]);
    vi.mocked(personsService.listPersons).mockResolvedValue([]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeCardsCount).toBe(0);
    expect(result.current.activePersonsCount).toBe(0);
    expect(result.current.hasCards).toBe(false);
    expect(result.current.hasPersons).toBe(false);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.needsOnboarding).toBe(true);
    expect(result.current.initialStep).toBe(1);

    expect(cardsService.listCards).toHaveBeenCalledWith({ is_active: true });
    expect(personsService.listPersons).toHaveBeenCalledWith({ is_active: true });
  });

  it('returns needsOnboarding: true and initialStep: 2 when persons exist but card is missing', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValue([]);
    vi.mocked(personsService.listPersons).mockResolvedValue([mockPerson]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeCardsCount).toBe(0);
    expect(result.current.activePersonsCount).toBe(1);
    expect(result.current.hasCards).toBe(false);
    expect(result.current.hasPersons).toBe(true);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.needsOnboarding).toBe(true);
    expect(result.current.initialStep).toBe(2);
  });

  it('returns needsOnboarding: true and initialStep: 3 when card exists but persons are missing', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValue([mockCard]);
    vi.mocked(personsService.listPersons).mockResolvedValue([]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeCardsCount).toBe(1);
    expect(result.current.activePersonsCount).toBe(0);
    expect(result.current.hasCards).toBe(true);
    expect(result.current.hasPersons).toBe(false);
    expect(result.current.isOnboarded).toBe(false);
    expect(result.current.needsOnboarding).toBe(true);
    expect(result.current.initialStep).toBe(3);
  });

  it('returns isOnboarded: true and needsOnboarding: false when both entities exist', async () => {
    vi.mocked(cardsService.listCards).mockResolvedValue([mockCard]);
    vi.mocked(personsService.listPersons).mockResolvedValue([mockPerson]);

    const { result } = renderHook(() => useOnboardingStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeCardsCount).toBe(1);
    expect(result.current.activePersonsCount).toBe(1);
    expect(result.current.hasCards).toBe(true);
    expect(result.current.hasPersons).toBe(true);
    expect(result.current.isOnboarded).toBe(true);
    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.initialStep).toBe(1);
  });
});
