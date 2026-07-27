import { useEffect, useMemo, useState } from 'react';
import type { InterviewAnalyticsDashboard } from '@codeforge/shared';

interface AnalyticsDashboardProps {
  apiBaseUrl: string;
  days?: number;
}

export function AnalyticsDashboard({ apiBaseUrl, days = 14 }: AnalyticsDashboardProps) {
  const [data, setData] = useState<InterviewAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/interviews/analytics/dashboard?days=${days}`);
        if (!response.ok) {
          throw new Error(`Failed to load analytics (${response.status})`);
        }
        const payload = (await response.json()) as InterviewAnalyticsDashboard;
        setData(payload);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiBaseUrl, days]);

  const topLanguages = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.submissionsByLanguage) as Array<[string, number]>;
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [data]);

  if (loading) {
    return <p>Loading analytics...</p>;
  }

  if (error) {
    return <p style={{ color: '#9f2222' }}>{error}</p>;
  }

  if (!data) {
    return <p>No analytics data yet.</p>;
  }

  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Interview Analytics ({data.rangeDays}d)</h3>
      <p>Total sessions: {data.summary.totalSessions}</p>
      <p>Completion rate: {(data.summary.completionRate * 100).toFixed(1)}%</p>
      <p>Average duration: {data.summary.avgDurationMinutes} min</p>
      <p>Total submissions: {data.summary.totalSubmissions}</p>
      <h4>Top Languages</h4>
      <ul>
        {topLanguages.map(([language, count]) => (
          <li key={language}>
            {language}: {count}
          </li>
        ))}
      </ul>
    </section>
  );
}
