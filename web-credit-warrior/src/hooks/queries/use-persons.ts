import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listPersons,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
} from '@/services/persons.service';
import type {
  PersonCreate,
  PersonUpdate,
  PersonRead,
  PersonFilters,
} from '@/types/api.types';

const PERSONS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to retrieve filtered or full list of participant persons.
 */
export function usePersons(filters?: PersonFilters) {
  return useQuery<PersonRead[]>({
    queryKey: queryKeys.persons.list(filters),
    queryFn: () => listPersons(filters),
    staleTime: PERSONS_STALE_TIME,
  });
}

/**
 * Hook to retrieve a single person by id.
 */
export function usePerson(id: string) {
  return useQuery<PersonRead>({
    queryKey: queryKeys.persons.detail(id),
    queryFn: () => getPerson(id),
    enabled: Boolean(id),
    staleTime: PERSONS_STALE_TIME,
  });
}

/**
 * Mutation hook to create a participant person with cascade invalidations.
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PersonCreate) => createPerson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to partially update a person with cascade invalidations.
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PersonUpdate }) => updatePerson(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.persons.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to delete a person with cascade invalidations.
 */
export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
