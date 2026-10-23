import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { checkHealth } from '@/services/health.service';
import type { HealthResponse } from '@/types/api.types';

/**
 * Hook to query backend service health check status.
 */
export function useHealthCheck(options?: { enabled?: boolean }) {
  return useQuery<HealthResponse>({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    staleTime: 0,
    ...options,
  });
}
