import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Pause, Play, Save, SkipBack, SkipForward } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { api } from '../services/http';
import { getSessionReplay, saveReplayNote } from '../services/api';
import type { ReplayEvent, SessionReplayData } from '../types';

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatDate(timestamp?: string): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function eventTone(kind: ReplayEvent['kind']): string {
  if (kind === 'code') return 'border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/8';
  if (kind === 'chat') return 'border-cyan-500/30 bg-cyan-500/8';
  if (kind === 'note') return 'border-amber-500/30 bg-amber-500/10';
  return 'border-white/10 bg-white/5';
}

export default function SessionReplay() {
  const { id = '', sessionId = '' } = useParams();
  const sessionKey = id || sessionId;
  const [data, setData] = useState<SessionReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activity, setActivity] = useState<string>('Ready to review replay');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getSessionReplay(sessionKey)
      .then((payload) => {
        if (!mounted) return;
        setData(payload);
        setCurrentTimeMs(payload.events[0]?.timeMs ?? 0);
        setSelectedEventId(payload.events[0]?.id ?? '');
        setSelectedRecordingId(payload.recordings[0]?.id ?? '');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load replay data');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessionKey]);

  const selectedEvent = useMemo(() => {
    if (!data) return null;
    return data.events.find((event) => event.id === selectedEventId)
      ?? [...data.events].reverse().find((event) => event.timeMs <= currentTimeMs)
      ?? data.events[0]
      ?? null;
  }, [data, currentTimeMs, selectedEventId]);

  const selectedRecording = useMemo(() => {
    if (!data) return null;
    return data.recordings.find((recording) => recording.id === selectedRecordingId) ?? data.recordings[0] ?? null;
  }, [data, selectedRecordingId]);

  const codeState = selectedEvent?.code ?? data?.events.find((event) => event.code)?.code ?? '// Replay code will appear here.';
  const diffState = selectedEvent?.diff ?? 'Select a code event to inspect the change.';

  const handleSeek = (timeMs: number, eventId?: string) => {
    setCurrentTimeMs(timeMs);
    setActivity(`Seeked to ${formatTime(timeMs)}`);
    if (eventId) setSelectedEventId(eventId);
  };

  const handleSaveNote = async () => {
    if (!note.trim() || !data) return;
    setSavingNote(true);
    try {
      const saved = await saveReplayNote(data.sessionId, note.trim());
      setData((current) => current ? { ...current, notes: [...current.notes, saved] } : current);
      setNote('');
      setActivity('Annotation saved');
    } finally {
      setSavingNote(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const response = await api.get<Blob>(`/api/interviews/${data.sessionId}/exports?format=zip`, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
      downloadBlob(blob, `replay-${data.sessionId}.zip`);
      setActivity('Export started');
    } catch {
      const fallback = new Blob(['Replay export is available in mock mode only.'], { type: 'text/plain;charset=utf-8' });
      downloadBlob(fallback, `replay-${data.sessionId}.zip`);
      setActivity('Export generated from fallback data');
    } finally {
      setExporting(false);
    }
  };

  const mediaSrc = selectedRecording?.storageUrl ?? (data ? `/api/interviews/${data.sessionId}/recordings/${selectedRecording?.id ?? 'screen'}` : '');

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(18,22,34,0.96),rgba(11,15,24,0.88))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Session replay</p>
            <h1 className="text-3xl font-semibold text-[color:var(--text-primary)]">{data?.title ?? `Replay ${sessionId}`}</h1>
            <p className="max-w-2xl text-sm text-[color:var(--text-muted)]">
              Playback code changes, audio/video, chat, and annotations at the same timestamp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10" type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause size={16} className="inline-block" /> : <Play size={16} className="inline-block" />} {playing ? 'Pause' : 'Play'}
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10" type="button" onClick={() => handleSeek(Math.max(0, currentTimeMs - 15_000))}>
              <SkipBack size={16} className="inline-block" /> -15s
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10" type="button" onClick={() => handleSeek(currentTimeMs + 15_000)}>
              <SkipForward size={16} className="inline-block" /> +15s
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              Speed
              <select className="bg-transparent text-white outline-none" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                {[0.5, 1, 1.25, 1.5, 2].map((value) => (
                  <option key={value} value={value} className="text-black">{value}x</option>
                ))}
              </select>
            </label>
            <button className="rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" type="button" onClick={handleExport} disabled={exporting}>
              <Download size={16} className="inline-block" /> {exporting ? 'Exporting…' : 'Export ZIP'}
            </button>
          </div>
        </div>

        {loading ? (
          <Card className="animate-pulse border-white/10 bg-white/5 p-6 text-white">
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
              <div className="h-96 rounded-2xl bg-white/8" />
              <div className="h-96 rounded-2xl bg-white/8" />
              <div className="h-96 rounded-2xl bg-white/8" />
            </div>
          </Card>
        ) : error ? (
          <Card className="border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">{error}</Card>
        ) : data ? (
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1.35fr)_360px]">
            <Card className="space-y-4 border-white/10 bg-white/5 p-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--text-muted)]">Timeline</p>
                <h2 className="mt-1 text-lg font-semibold">Events</h2>
              </div>
              <div className="space-y-3">
                {data.events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleSeek(event.timeMs, event.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${selectedEvent?.id === event.id ? 'border-[color:var(--color-primary)]/50 bg-[color:var(--color-primary)]/12' : eventTone(event.kind)}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                      <span>{formatTime(event.timeMs)}</span>
                      <span className="capitalize">{event.kind}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{event.title}</div>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{event.detail}</p>
                  </button>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Code playback</p>
                    <h2 className="mt-1 text-lg font-semibold">Current state at {formatTime(currentTimeMs)}</h2>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-[color:var(--text-muted)]">
                    Scrub
                    <input
                      className="w-64 accent-[color:var(--color-primary)]"
                      type="range"
                      min={0}
                      max={Math.max(...data.events.map((event) => event.timeMs), 1)}
                      step={1_000}
                      value={currentTimeMs}
                      onChange={(event) => handleSeek(Number(event.target.value))}
                    />
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                      <span>Code state</span>
                      <span>{selectedEvent?.kind === 'code' ? selectedEvent.title : 'Derived snapshot'}</span>
                    </div>
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm leading-6 text-emerald-200">
                      {codeState}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                      <span>Diff view</span>
                      <span>{formatDate(data.startedAt)}</span>
                    </div>
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm leading-6 text-[color:var(--text-muted)]">
                      {diffState}
                    </pre>
                  </div>
                </div>
              </Card>

              <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Media player</p>
                    <h2 className="mt-1 text-lg font-semibold">{selectedRecording?.label ?? 'Recording'}</h2>
                  </div>
                  <div className="flex gap-2">
                    {data.recordings.map((recording) => (
                      <button key={recording.id} type="button" onClick={() => setSelectedRecordingId(recording.id)} className={`rounded-full px-3 py-1 text-xs transition ${selectedRecording?.id === recording.id ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white/8 text-[color:var(--text-muted)] hover:bg-white/12'}`}>
                        {recording.kind}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                  <video controls className="h-[320px] w-full bg-black object-cover" src={mediaSrc} poster="">
                    Sorry, your browser does not support the video element.
                  </video>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Chat</p>
                  <h2 className="mt-1 text-lg font-semibold">Conversation</h2>
                </div>
                <div className="space-y-3">
                  {data.chat.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                        <span>{message.author}</span>
                        <span>{formatDate(message.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{message.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Annotations</p>
                  <h2 className="mt-1 text-lg font-semibold">Notes</h2>
                </div>
                <div className="space-y-3">
                  {data.notes.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-3">
                      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                        <span>{entry.author}</span>
                        <span>{formatTime(entry.timeMs)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{entry.note}</p>
                    </div>
                  ))}
                </div>
                <textarea
                  className="min-h-[104px] w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-3 py-3 text-sm text-white outline-none ring-0 placeholder:text-[color:var(--text-muted)]"
                  placeholder="Add an annotation for this session"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote || !note.trim()}
                >
                  <Save size={16} /> {savingNote ? 'Saving…' : 'Save note'}
                </button>
              </Card>

              <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Export</p>
                  <h2 className="mt-1 text-lg font-semibold">Download artifacts</h2>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={handleExport} disabled={exporting}>
                  <Download size={16} /> {exporting ? 'Generating…' : 'Download ZIP'}
                </button>
                <p className="text-sm text-[color:var(--text-muted)]">Includes code timeline, recordings, chat, and notes.</p>
              </Card>
            </div>
          </div>
        ) : null}

        {data && (
          <Card className="border-white/10 bg-white/5 p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Activity log</p>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">{activity}</p>
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">
                Started {formatDate(data.startedAt)} · Ended {formatDate(data.endedAt)}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {data.activityLog.map((entry) => (
                <motion.div key={entry.id} whileHover={{ y: -2 }} className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
                  <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                    <span className="uppercase tracking-[0.25em]">{entry.level}</span>
                    <span>{formatDate(entry.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{entry.message}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AnimatedPage>
  );
}
