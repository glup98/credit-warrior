import { apiClient } from './api-client';
import type {
  PersonCreate,
  PersonUpdate,
  PersonRead,
  PersonFilters,
} from '@/types/api.types';

/**
 * Retrieves list of persons with optional active filtering.
 */
export async function listPersons(filters?: PersonFilters): Promise<PersonRead[]> {
  return apiClient.get<PersonRead[]>('/api/v1/persons', filters as Record<string, unknown>);
}

/**
 * Retrieves a single person by unique identifier.
 */
export async function getPerson(id: string): Promise<PersonRead> {
  return apiClient.get<PersonRead>(`/api/v1/persons/${id}`);
}

/**
 * Creates a new participant person.
 */
export async function createPerson(data: PersonCreate): Promise<PersonRead> {
  return apiClient.post<PersonRead>('/api/v1/persons', data);
}

/**
 * Partially updates an existing person (name, color, active state).
 */
export async function updatePerson(id: string, data: PersonUpdate): Promise<PersonRead> {
  return apiClient.patch<PersonRead>(`/api/v1/persons/${id}`, data);
}

/**
 * Deletes a person. Returns 204 No Content.
 */
export async function deletePerson(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/persons/${id}`);
}

export const personsService = {
  list: listPersons,
  getById: getPerson,
  create: createPerson,
  update: updatePerson,
  remove: deletePerson,
};
