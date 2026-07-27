import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useProblems } from './useProblems';
import { fetchProblemsPage } from '../services/api';

vi.mock('../services/api', () => ({
  fetchProblemsPage: vi.fn(),
}));

const mockedFetchProblemsPage = vi.mocked(fetchProblemsPage);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useProblems', () => {
  it('returns problems from the API helper', async () => {
    mockedFetchProblemsPage.mockResolvedValue({
      items: [
        {
          id: 'prob-1',
          title: 'Two Sum',
          slug: 'two-sum',
          difficulty: 'EASY',
          tags: ['arrays'],
          author: 'Code Forge',
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useProblems({ q: 'sum' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.total).toBe(1);
    expect(mockedFetchProblemsPage).toHaveBeenCalledWith({ q: 'sum' });
  });
});
