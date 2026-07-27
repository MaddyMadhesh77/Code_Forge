import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, RefreshCw, TriangleAlert, TrendingUp } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { api } from '../services/http';
import { getMetricsErrors, getTopProblems, getUsageMetrics } from '../services/api';
import type { MetricsErrorItem, TopProblemItem, UsageMetrics } from '../types';

const RANGE_OPTIONS = ['7d', '30d'] as const;
const SERVICE_OPTIONS = ['execution', 'replay', 'auth'] as const;
const EXPORT_OPTIONS = ['csv', 'json'] as const;

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function renderChart(series: UsageMetrics['series']) {
  if (series.length < 2) return null;

  const values = series.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return { x, y };
    });

  const path = `M ${points[0].x},100 L ${points.map((point) => `${point.x},${point.y}`).join(' ')} L ${points[points.length - 1].x},100 Z`;

  return (
    <svg viewBox="0 0 100 100" className="h-72 w-full overflow-visible rounded-3xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-3">
      <defs>
        <linearGradient id="usageGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(11,95,255,0.35)" />
          <stop offset="100%" stopColor="rgba(11,95,255,0.02)" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#usageGradient)" opacity="0.9" />
      <polyline fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
      {points.map((point, index) => (
        <circle key={series[index].date} cx={point.x} cy={point.y} r="1.5" fill="var(--accent-primary)" opacity="0.9" />
      ))}
    </svg>
  );
}

export function Analytics() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [service, setService] = useState<(typeof SERVICE_OPTIONS)[number]>('execution');
  const [exportFormat, setExportFormat] = useState<(typeof EXPORT_OPTIONS)[number]>('csv');
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [errors, setErrors] = useState<MetricsErrorItem[]>([]);
  const [topProblems, setTopProblems] = useState<TopProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setRefreshing(true);
    const [usageData, errorData, problemData] = await Promise.all([
      getUsageMetrics(range),
      getMetricsErrors(service),
      getTopProblems(),
    ]);
    setUsage(usageData);
    setErrors(errorData);
    setTopProblems(problemData);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [range, service]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const series = usage?.series ?? [];
    const total = series.reduce((sum, entry) => sum + entry.value, 0);
    const peak = series.length > 0 ? Math.max(...series.map((entry) => entry.value)) : 0;
    const average = series.length > 0 ? Math.round(total / series.length) : 0;
    const totalErrors = errors.reduce((sum, item) => sum + item.count, 0);
    return [
      { label: 'Average usage', value: average, detail: `${range} window` },
      { label: 'Peak usage', value: peak, detail: 'Highest observed point' },
      { label: 'Top problem submissions', value: topProblems[0]?.submissions ?? 0, detail: topProblems[0]?.title ?? 'No data' },
      { label: 'Open error count', value: totalErrors, detail: service },
    ];
  }, [usage, errors, topProblems, range, service]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get<Blob>(`/api/metrics/export?range=${range}&format=${exportFormat}`, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
      downloadBlob(blob, `metrics-${range}.${exportFormat}`);
      setToast('Export started');
    } catch {
      const fallback = new Blob([JSON.stringify({ range, exportFormat, usage, errors, topProblems }, null, 2)], { type: 'application/json;charset=utf-8' });
      downloadBlob(fallback, `metrics-${range}.json`);
      setToast('Fallback export generated');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 text-[color:var(--text-primary)]">
        <div className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Reports / Analytics</p>
            <h1 className="mt-1 text-3xl font-semibold text-[color:var(--text-primary)]">Product, usage, and error trends</h1>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Track usage over time, inspect top errors, and export operational data on demand.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-2">
            {RANGE_OPTIONS.map((option) => (
              <button key={option} type="button" onClick={() => setRange(option)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === option ? 'bg-[color:var(--color-primary)] text-white' : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-surface-active)] hover:text-[color:var(--text-primary)]'}`}>
                {option}
              </button>
            ))}
            <button className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-surface-active)]" type="button" onClick={() => void load()}>
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-center justify-between text-sm text-[color:var(--text-muted)]">
                <span>{stat.label}</span>
                <TrendingUp size={16} />
              </div>
              <div className="mt-3 text-3xl font-semibold">{stat.value}</div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">{stat.detail}</div>
            </Card>
          ))}
        </div>

        {loading && <Card className="text-[color:var(--text-muted)]">Loading metrics…</Card>}

        {!loading && usage && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Usage</p>
                  <h2 className="mt-1 text-lg font-semibold">Requests over time</h2>
                </div>
                <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-3 py-2 text-sm text-[color:var(--text-muted)]">
                  {usage.range}
                </div>
              </div>
              {renderChart(usage.series)}
            </Card>

            <Card className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Filters</p>
                <h2 className="mt-1 text-lg font-semibold">Export and segmentation</h2>
              </div>
              <label className="space-y-2 text-sm">
                <span className="text-[color:var(--text-muted)]">Error service</span>
                <select className="w-full rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 outline-none" value={service} onChange={(event) => setService(event.target.value as typeof service)}>
                  {SERVICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[color:var(--text-muted)]">Export format</span>
                <select className="w-full rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 outline-none" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)}>
                  {EXPORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option.toUpperCase()}</option>
                  ))}
                </select>
              </label>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => void handleExport()} disabled={exporting}>
                <ArrowDownToLine size={16} /> {exporting ? 'Exporting…' : 'Download export'}
              </button>
              <div className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-4 text-sm text-[color:var(--text-muted)]">
                Click a range, refetch data, or export CSV/JSON without leaving the page.
              </div>
            </Card>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Top problems</p>
                <h2 className="mt-1 text-lg font-semibold">Most popular problems</h2>
              </div>
              <span className="rounded-full border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-3 py-1 text-xs text-[color:var(--text-muted)]">{topProblems.length} items</span>
            </div>
            <div className="space-y-3">
              {topProblems.map((problem, index) => (
                <div key={problem.id} className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-[color:var(--text-muted)]">#{index + 1}</div>
                      <div className="text-base font-semibold">{problem.title}</div>
                    </div>
                    <div className="text-right text-sm text-[color:var(--text-muted)]">
                      <div>{problem.submissions} submissions</div>
                      <div>{problem.acceptanceRate.toFixed(0)}% accepted</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border-primary)]">
                    <div className="h-full rounded-full bg-[color:var(--color-primary)]" style={{ width: `${Math.min(100, problem.acceptanceRate)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Error list</p>
                <h2 className="mt-1 text-lg font-semibold">Top errors for {service}</h2>
              </div>
              <TriangleAlert size={18} className="text-[color:var(--status-warning)]" />
            </div>
            <div className="space-y-3">
              {errors.map((error) => (
                <div key={error.id} className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-[color:var(--text-primary)]">{error.message}</div>
                      <div className="text-[color:var(--text-muted)]">Last seen {new Date(error.lastSeenAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold">{error.count}</div>
                      <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">hits</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm text-[color:var(--text-primary)] shadow-lg">{toast}</div>}
      </div>
    </AnimatedPage>
  );
}
