import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  getDashboardSummary,
  getDashboardProjection,
} from '@/services/dashboard.service';
import type {
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  DashboardProjectionParams,
} from '@/types/api.types';

const DASHBOARD_STALE_TIME = 30 * 1000; // 30 seconds

/**
 * Hook to retrieve monthly aggregate billing dashboard summary.
 */
export function useDashboardSummary(period?: string) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: queryKeys.dashboard.summary(period),
    queryFn: () => getDashboardSummary(period ? { period } : undefined),
    staleTime: DASHBOARD_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to retrieve multi-month installment projection for the dashboard.
 */
export function useDashboardProjection(params?: DashboardProjectionParams) {
  return useQuery<DashboardProjectionResponse>({
    queryKey: queryKeys.dashboard.projection(params),
    queryFn: () => getDashboardProjection(params),
    staleTime: DASHBOARD_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}
