import { apiClient } from './api-client';
import type {
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  DashboardSummaryParams,
  DashboardProjectionParams,
} from '@/types/api.types';

/**
 * Retrieves aggregated monthly summary for dashboard.
 */
export async function getDashboardSummary(
  params?: DashboardSummaryParams,
): Promise<DashboardSummaryResponse> {
  return apiClient.get<DashboardSummaryResponse>(
    '/api/v1/dashboard/summary',
    params as Record<string, unknown>,
  );
}

/**
 * Retrieves multi-month projection for billing and installments.
 */
export async function getDashboardProjection(
  params?: DashboardProjectionParams,
): Promise<DashboardProjectionResponse> {
  return apiClient.get<DashboardProjectionResponse>(
    '/api/v1/dashboard/projection',
    params as Record<string, unknown>,
  );
}

export const dashboardService = {
  getSummary: getDashboardSummary,
  getProjection: getDashboardProjection,
};
