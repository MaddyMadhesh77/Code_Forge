import { useEffect, useState } from 'react';
import {
  getDashboardOverview,
  getRecentInterviews,
  getRecentProblems,
  getUsageMetrics,
} from '../api';

export function useDashboardOverview(range: string) {
  const [data, setData] = useState<{
    overview: Awaited<ReturnType<typeof getDashboardOverview>>;
    recentSessions: Awaited<ReturnType<typeof getRecentInterviews>>;
    recentProblems: Awaited<ReturnType<typeof getRecentProblems>>;
    usage: Awaited<ReturnType<typeof getUsageMetrics>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getDashboardOverview(range),
      getRecentInterviews(5),
      getRecentProblems(5),
      getUsageMetrics(range),
    ])
      .then(([overview, sessions, problems, usage]) => {
        if (!mounted) return;
        setData({ overview, recentSessions: sessions, recentProblems: problems, usage });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [range]);

  return { data, loading, error, refetch: () => Promise.resolve() };
}
