import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ArrowUpRight, RefreshCw, PlayCircle, FilePlus2 } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { DifficultyBadge, StatusBadge } from '../components/ui/Badge';
import { useDashboardOverview } from '../hooks/useDashboardOverview';
import type { TrendPoint, InterviewSession, ProblemListItem } from '../types';
import styles from './Dashboard.module.css';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function renderSparkline(series: TrendPoint[], color: string) {
  if (series.length < 2) return null;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className={styles.sparkline} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
      />
    </svg>
  );
}

function renderAreaChart(series: TrendPoint[], color: string) {
  if (series.length < 2) return null;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { x, y };
  });

  const path = `M ${points[0].x},100 L ${points.map((p) => `${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},100 Z`;

  return (
    <svg viewBox="0 0 100 100" className={styles.areaChart} preserveAspectRatio="none">
      <path d={path} fill={color} opacity="0.2" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      />
    </svg>
  );
}

function metricDelta(series: TrendPoint[]): string {
  if (series.length < 2) return '—';
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const diff = last - first;
  const pct = first === 0 ? 0 : (diff / first) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff} (${sign}${pct.toFixed(0)}%)`;
}

function activityFromSessions(sessions: InterviewSession[]) {
  return sessions.map((session) => {
    const timestamp = session.scheduledAt ?? session.startedAt ?? new Date().toISOString();
    return {
      id: session.id,
      label: `${session.title} (${session.status.toLowerCase()})`,
      timeLabel: formatDate(timestamp),
      timestamp,
      link: `/sessions/${session.id}`,
    };
  });
}

function activityFromProblems(problems: ProblemListItem[]) {
  return problems.map((problem) => ({
    id: problem.id,
    label: `Problem updated: ${problem.title}`,
    timeLabel: formatDate(problem.updatedAt),
    timestamp: problem.updatedAt,
    link: `/problems/${problem.slug}`,
  }));
}

export function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState('7d');
  const { data, loading, error, refetch } = useDashboardOverview(range);
  const errorMessage = error instanceof Error ? error.message : null;

  const overview = data?.overview;
  const sessions: InterviewSession[] = data?.recentSessions ?? [];
  const problems: ProblemListItem[] = data?.recentProblems ?? [];
  const usage = data?.usage;

  const activityFeed = useMemo(() => {
    return [...activityFromSessions(sessions), ...activityFromProblems(problems)]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [sessions, problems]);

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Dashboard</h1>
            <p className={styles.subtitle}>System health, interviews, and trends.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.rangeSelect}>
              <CalendarClock size={16} />
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionButton} type="button" onClick={() => navigate('/problems/new')}>
                <FilePlus2 size={16} /> New Problem
              </button>
              <button className={styles.primaryButton} type="button" onClick={() => navigate('/sessions')}>
                <PlayCircle size={16} /> Start Interview
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className={styles.toast} role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => refetch()}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        <div className={styles.metricsGrid}>
          {[
            {
              label: 'Active sessions',
              value: overview?.activeSessions,
              delta: overview?.trendSeries ? metricDelta(overview.trendSeries) : '—',
              series: overview?.trendSeries ?? [],
              color: 'var(--accent-cyan)',
            },
            {
              label: 'Interviews today',
              value: overview?.interviewsToday,
              delta: overview?.trendSeries ? metricDelta(overview.trendSeries.slice(-7)) : '—',
              series: overview?.trendSeries ?? [],
              color: 'var(--accent-primary)',
            },
            {
              label: 'Queue length',
              value: overview?.queuedJobs,
              delta: overview?.trendSeries ? metricDelta(overview.trendSeries.slice(-5)) : '—',
              series: overview?.trendSeries ?? [],
              color: 'var(--accent-amber)',
            },
            {
              label: 'Avg exec time (s)',
              value: overview?.avgExecTime,
              delta: overview?.trendSeries ? metricDelta(overview.trendSeries.slice(-4)) : '—',
              series: overview?.trendSeries ?? [],
              color: 'var(--accent-rose)',
            },
          ].map((metric) => (
            <Card key={metric.label} className={styles.metricCard}>
              {loading ? (
                <div className={styles.metricSkeleton} />
              ) : (
                <>
                  <div className={styles.metricHeader}>
                    <span>{metric.label}</span>
                    <span className={styles.metricDelta}>{metric.delta}</span>
                  </div>
                  <div className={styles.metricValue}>{metric.value ?? '—'}</div>
                  <div className={styles.metricSparkline}>
                    {renderSparkline(metric.series, metric.color)}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>

        <div className={styles.mainGrid}>
          <Card className={styles.listCard}>
            <div className={styles.cardHeader}>
              <h3>Recent sessions</h3>
              <button className={styles.linkButton} type="button" onClick={() => navigate('/sessions')}>
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            {loading ? (
              <div className={styles.listSkeleton} />
            ) : (
              <div className={styles.listRows}>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    className={styles.listRow}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <div>
                      <div className={styles.rowTitle}>{session.title}</div>
                      <div className={styles.rowMeta}>{session.creatorName}</div>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.rowMeta}>{formatDate(session.scheduledAt)}</span>
                      <StatusBadge status={session.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className={styles.listCard}>
            <div className={styles.cardHeader}>
              <h3>Recent problems</h3>
              <button className={styles.linkButton} type="button" onClick={() => navigate('/problems')}>
                View all <ArrowUpRight size={14} />
              </button>
            </div>
            {loading ? (
              <div className={styles.listSkeleton} />
            ) : (
              <div className={styles.listRows}>
                {problems.map((problem) => (
                  <Link key={problem.id} to={`/problems/${problem.slug}`} className={styles.problemRow}>
                    <div>
                      <div className={styles.rowTitle}>{problem.title}</div>
                      <div className={styles.rowMeta}>Updated {formatDate(problem.updatedAt)}</div>
                    </div>
                    <div className={styles.rowRight}>
                      <DifficultyBadge difficulty={problem.difficulty} />
                      <span className={styles.tagRow}>
                        {problem.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className={styles.tagPill}>{tag}</span>
                        ))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.lowerGrid}>
          <Card className={styles.activityCard}>
            <div className={styles.cardHeader}>
              <h3>Activity feed</h3>
            </div>
            {loading ? (
              <div className={styles.listSkeleton} />
            ) : (
              <div className={styles.activityList}>
                {activityFeed.map((item) => (
                  <Link key={item.id} to={item.link} className={styles.activityRow}>
                    <span>{item.label}</span>
                    <span className={styles.rowMeta}>{item.timeLabel}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3>Usage trend</h3>
              <span className={styles.rowMeta}>{range.toUpperCase()}</span>
            </div>
            {loading ? (
              <div className={styles.chartSkeleton} />
            ) : (
              <div className={styles.chartWrapper}>
                {usage ? renderAreaChart(usage.series, 'var(--accent-primary)') : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
}
