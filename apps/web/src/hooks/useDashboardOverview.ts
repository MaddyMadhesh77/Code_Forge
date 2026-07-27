import { useQuery } from '@tanstack/react-query';
import { fetchDashboardOverview } from '../services/api';

export function useDashboardOverview(range: string) {
  const query = useQuery({
    queryKey: ['dashboard-overview', range],
    queryFn: () => fetchDashboardOverview(range),
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
