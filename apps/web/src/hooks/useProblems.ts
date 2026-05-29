import { useQuery } from '@tanstack/react-query';
import { fetchProblemDetail, fetchProblemsPage } from '../services/api';

export interface ProblemsQueryParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export function useProblems(params: ProblemsQueryParams = {}) {
  const query = useQuery({
    queryKey: ['problems', params],
    queryFn: () => fetchProblemsPage(params),
  });

  return {
    data: query.data ?? { items: [], total: 0 },
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProblem(id?: string) {
  const query = useQuery({
    queryKey: ['problem', id],
    enabled: Boolean(id),
    queryFn: () => fetchProblemDetail(id ?? ''),
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
