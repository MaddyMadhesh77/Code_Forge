import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Clock3, RotateCw, SquareArrowOutUpRight, SquareX } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { cancelQueueJob, getQueueJobLogs, getQueueJobs, retryQueueJob } from '../services/api';
import type { QueueJob, QueueJobLog } from '../types';

type JobStateFilter = '' | 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const statePills: Record<QueueJob['state'], string> = {
  queued: 'bg-[color:var(--bg-surface-hover)] text-[color:var(--text-secondary)] border-[color:var(--border-primary)]',
  running: 'bg-[rgba(7,198,167,0.12)] text-[color:var(--accent-cyan)] border-[rgba(7,198,167,0.2)]',
  succeeded: 'bg-[rgba(52,211,153,0.12)] text-[color:var(--status-success)] border-[rgba(52,211,153,0.2)]',
  failed: 'bg-[rgba(239,68,68,0.12)] text-[color:var(--status-error)] border-[rgba(239,68,68,0.2)]',
  canceled: 'bg-[rgba(255,178,36,0.12)] text-[color:var(--status-warning)] border-[rgba(255,178,36,0.2)]',
};

export default function QueuePage() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<JobStateFilter>('');
  const [pollEnabled, setPollEnabled] = useState(true);
  const [pollInterval, setPollInterval] = useState(10_000);
  const [expandedJobId, setExpandedJobId] = useState('');
  const [logsByJob, setLogsByJob] = useState<Record<string, QueueJobLog[]>>({});
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [toast, setToast] = useState('');

  const loadJobs = async () => {
    setLoading(true);
    const response = await getQueueJobs({ state: stateFilter || undefined, page: 1 });
    setJobs(response.items);
    setLoading(false);
  };

  useEffect(() => {
    void loadJobs();
  }, [stateFilter]);

  useEffect(() => {
    if (!pollEnabled) return undefined;
    const timer = window.setInterval(() => {
      void loadJobs();
    }, pollInterval);
    return () => window.clearInterval(timer);
  }, [pollEnabled, pollInterval, stateFilter]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => ({
    total: jobs.length,
    failed: jobs.filter((job) => job.state === 'failed').length,
    active: jobs.filter((job) => job.state === 'running' || job.state === 'queued').length,
  }), [jobs]);

  const openLogs = async (job: QueueJob) => {
    setSelectedJob(job);
    setExpandedJobId(job.id);
    if (!logsByJob[job.id]) {
      const logs = await getQueueJobLogs(job.id);
      setLogsByJob((current) => ({ ...current, [job.id]: logs }));
    }
  };

  const executeJobAction = async (job: QueueJob, action: 'retry' | 'cancel') => {
    if (action === 'retry') {
      await retryQueueJob(job.id);
      setJobs((current) => current.map((entry) => (entry.id === job.id ? { ...entry, state: 'queued', attempts: entry.attempts + 1 } : entry)));
      setToast('Job retried');
    } else {
      if (!window.confirm(`Cancel job ${job.id}?`)) return;
      await cancelQueueJob(job.id);
      setJobs((current) => current.map((entry) => (entry.id === job.id ? { ...entry, state: 'canceled' } : entry)));
      setToast('Job canceled');
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 text-[color:var(--text-primary)]">
        <div className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Queue / Jobs</p>
            <h1 className="mt-1 text-3xl font-semibold text-[color:var(--text-primary)]">Background job monitoring</h1>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Inspect execution jobs, retry failures, cancel work, and drill into logs without leaving the queue.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Active</div>
              <div className="text-xl font-semibold">{counts.active}</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Failed</div>
              <div className="text-xl font-semibold">{counts.failed}</div>
            </div>
          </div>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
                <span className="mr-3">State</span>
                <select className="bg-transparent text-[color:var(--text-primary)] outline-none" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as JobStateFilter)}>
                  <option value="">All</option>
                  <option value="queued">Queued</option>
                  <option value="running">Running</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </label>
              <label className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
                <span className="mr-3">Poll</span>
                <select className="bg-transparent text-[color:var(--text-primary)] outline-none" value={pollInterval} onChange={(event) => setPollInterval(Number(event.target.value))}>
                  <option value={5_000}>5s</option>
                  <option value={10_000}>10s</option>
                  <option value={20_000}>20s</option>
                  <option value={30_000}>30s</option>
                </select>
              </label>
            </div>
            <button className={`inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border-primary)] px-4 py-3 text-sm font-semibold transition ${pollEnabled ? 'bg-[color:var(--color-primary)] text-white' : 'bg-[color:var(--bg-surface-hover)] text-[color:var(--text-muted)]'}`} type="button" onClick={() => setPollEnabled((value) => !value)}>
              <Clock3 size={16} /> {pollEnabled ? 'Polling on' : 'Polling off'}
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[color:var(--border-primary)]">
            <div className="grid grid-cols-[1fr_1.1fr_0.7fr_0.7fr_0.9fr_1fr] gap-3 bg-[color:var(--bg-surface-hover)] px-4 py-3 text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
              <div>Job ID</div>
              <div>Type</div>
              <div>Status</div>
              <div>Attempts</div>
              <div>Timestamps</div>
              <div>Actions</div>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-[color:var(--bg-surface-hover)]" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--text-muted)]">No jobs match the current filter.</div>
            ) : (
              <div className="divide-y divide-[color:var(--border-subtle)]">
                {jobs.map((job) => (
                  <div key={job.id} className="text-sm text-[color:var(--text-primary)]">
                    <div className="grid grid-cols-[1fr_1.1fr_0.7fr_0.7fr_0.9fr_1fr] gap-3 px-4 py-4">
                      <button className="text-left font-mono text-sm text-[color:var(--text-primary)] underline-offset-4 hover:underline" type="button" onClick={() => setExpandedJobId((current) => (current === job.id ? '' : job.id))}>
                        {job.id}
                      </button>
                      <div className="text-[color:var(--text-muted)]">{job.type}</div>
                      <div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statePills[job.state]}`}>{job.state}</span>
                      </div>
                      <div className="text-[color:var(--text-muted)]">{job.attempts}</div>
                      <div className="text-[color:var(--text-muted)]">
                        <div>Created {formatDate(job.createdAt)}</div>
                        <div>Updated {formatDate(job.updatedAt)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-self-end">
                        <button className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-surface-hover)]" type="button" onClick={() => void openLogs(job)}>
                          <ChevronRight size={14} className="inline-block" /> Logs
                        </button>
                        <button className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-surface-hover)]" type="button" onClick={() => void executeJobAction(job, 'retry')}>
                          <RotateCw size={14} className="inline-block" /> Retry
                        </button>
                        <button className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-xs font-semibold text-[color:var(--status-error)] transition hover:bg-[rgba(239,68,68,0.18)]" type="button" onClick={() => void executeJobAction(job, 'cancel')}>
                          <SquareX size={14} className="inline-block" /> Cancel
                        </button>
                      </div>
                    </div>

                    {expandedJobId === job.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-4 py-4">
                        <div className="flex items-center justify-between gap-3 text-sm text-[color:var(--text-secondary)]">
                          <div className="font-semibold">Expanded log preview</div>
                          <button className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]" type="button" onClick={() => setSelectedJob(job)}>
                            <SquareArrowOutUpRight size={14} className="inline-block" /> Open drawer
                          </button>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(logsByJob[job.id] ?? []).map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] p-3 text-sm">
                              <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                                <span className="uppercase tracking-[0.22em]">{entry.level}</span>
                                <span>{formatDate(entry.timestamp)}</span>
                              </div>
                              <p className="mt-1 text-[color:var(--text-primary)]">{entry.message}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {selectedJob && (
          <motion.aside initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="fixed right-0 top-0 z-40 h-full w-full max-w-[420px] border-l border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] p-6 text-[color:var(--text-primary)] shadow-[-20px_0_80px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Job details</p>
                <h2 className="mt-1 text-xl font-semibold">{selectedJob.type}</h2>
                <p className="text-sm text-[color:var(--text-muted)]">{selectedJob.id}</p>
              </div>
              <button className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] px-3 py-2 text-xs text-[color:var(--text-primary)]" type="button" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Card>
                <div className="flex items-center justify-between text-sm">
                  <span>Status</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statePills[selectedJob.state]}`}>{selectedJob.state}</span>
                </div>
                <div className="mt-3 text-sm text-[color:var(--text-muted)]">Attempts: {selectedJob.attempts}</div>
                <div className="mt-1 text-sm text-[color:var(--text-muted)]">Worker: {selectedJob.worker ?? 'unassigned'}</div>
                <div className="mt-1 text-sm text-[color:var(--text-muted)]">Progress: {selectedJob.progress}%</div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Payload</h3>
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]">{selectedJob.payloadSummary}</p>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Logs</h3>
                <div className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-1">
                  {(logsByJob[selectedJob.id] ?? []).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-surface-hover)] p-3 text-sm">
                      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                        <span>{entry.level}</span>
                        <span>{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-[color:var(--text-primary)]">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.aside>
        )}

        {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[color:var(--border-primary)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm text-[color:var(--text-primary)] shadow-lg">{toast}</div>}
      </div>
    </AnimatedPage>
  );
}
