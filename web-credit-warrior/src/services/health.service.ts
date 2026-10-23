import { apiClient } from './api-client';
import type { HealthResponse } from '@/types/api.types';

/**
 * Health service interacting with GET /health endpoint.
 */
export async function checkHealth(): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health');
}
