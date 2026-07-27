import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Save,
  Send,
  Square,
  Terminal,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { DifficultyBadge, StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useInterview } from '../hooks/useInterview';
import {
  createReport,
  endInterview,
  getExecutionRunStatus,
  getInterview,
  getProblemById,
  getProblems,
  joinInterviewSession,
  runProblemExecution,
  saveInterviewNote,
  submitInterviewRatings,
} from '../services/api';
import type { ExecutionRunResult, InterviewSession, Language, Problem } from '../types';
import styles from './InterviewRoom.module.css';

function formatDuration(startedAt?: string): string {
  if (!startedAt) return '00:00';
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function InterviewRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const runTokenRef = useRef(0);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [joinLoading, setJoinLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [rtcReady, setRtcReady] = useState(false);
  const [rtcConfig, setRtcConfig] = useState<{ iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }> } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<ExecutionRunResult | null>(null);
  const [runHistory, setRunHistory] = useState<ExecutionRunResult[]>([]);

  const [chatInput, setChatInput] = useState('');
  const [note, setNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const [elapsed, setElapsed] = useState('00:00');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingsSaving, setRatingsSaving] = useState(false);
  const [ratings, setRatings] = useState({
    problemSolving: 3,
    communication: 3,
    codeQuality: 3,
    collaboration: 3,
  });
  const [feedback, setFeedback] = useState('');
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState('');

  const {
    isConnected,
    participants,
    remoteCode,
    antiCheatAlerts,
    chatMessages,
    runResults,
    notesUpdates,
    rtcOffers,
    rtcAnswers,
    rtcIceCandidates,
    emitCodeChange,
    emitTabSwitch,
    emitWindowBlur,
    emitCopyAttempt,
    emitPasteAttempt,
    emitChatMessage,
    emitRunRequest,
    emitRunResult,
    emitNotesUpdate,
    emitRatingSubmit,
    emitWebRtcOffer,
    emitWebRtcAnswer,
    emitWebRtcIceCandidate,
  } = useInterview({
    sessionId: sessionId ?? '',
    userId: user?.id ?? '',
    userName: user?.displayName ?? '',
    role: (user?.role as 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER') ?? 'CANDIDATE',
    enabled: joined && !!sessionId && !!user,
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const activeSessionId = sessionId ?? '';
    const activeUser = user;
    if (!activeSessionId || !activeUser) return;
    const authenticatedUser = activeUser;

    let mounted = true;

    async function bootstrap(): Promise<void> {
      setJoinLoading(true);
      setJoinError('');
      try {
        const joinData = await joinInterviewSession(activeSessionId, {
          userId: authenticatedUser.id,
          role: (authenticatedUser.role as 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER') ?? 'CANDIDATE',
        });

        if (!mounted) return;
        setJoinToken(joinData.sessionToken);
        setRtcReady(Boolean(joinData.rtcConfig));
        setRtcConfig(joinData.rtcConfig ?? null);
        setJoined(true);

        const [sessionData, allProblems] = await Promise.all([getInterview(activeSessionId), getProblems()]);
        if (!mounted) return;

        setSession(sessionData);

        const preferredProblemId = sessionData?.problemId ?? allProblems[0]?.id;
        const loadedProblem = preferredProblemId ? await getProblemById(preferredProblemId) : null;
        if (!mounted) return;

        const resolvedProblem = loadedProblem ?? allProblems[0] ?? null;
        setProblem(resolvedProblem);

        if (resolvedProblem) {
          const firstLang = (resolvedProblem.templates?.[0]?.language ?? resolvedProblem.supportedLangs[0] ?? 'python') as Language;
          setLanguage(firstLang);
          setCode(resolvedProblem.templates?.find((item) => item.language === firstLang)?.code ?? '# Start coding\n');
        }
      } catch (error) {
        if (!mounted) return;
        setJoinError(error instanceof Error ? error.message : 'Unable to join interview session.');
      } finally {
        if (mounted) setJoinLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [sessionId, user]);

  useEffect(() => {
    let mounted = true;
    async function prepareLocalStream(): Promise<void> {
      if (!rtcReady) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setLocalStream(stream);
      } catch {
        setToast('Camera/mic permission unavailable.');
      }
    }

    prepareLocalStream();
    return () => {
      mounted = false;
      setLocalStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [rtcReady]);

  useEffect(() => {
    if (!session?.startedAt) return;
    const interval = setInterval(() => setElapsed(formatDuration(session.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) emitTabSwitch(); };
    const onBlur = () => emitWindowBlur();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [emitTabSwitch, emitWindowBlur]);

  useEffect(() => {
    const onCopy = () => emitCopyAttempt();
    const onPaste = () => emitPasteAttempt();
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
  }, [emitCopyAttempt, emitPasteAttempt]);

  useEffect(() => {
    if (remoteCode && remoteCode !== code) setCode(remoteCode);
  }, [remoteCode]);

  useEffect(() => {
    if (notesUpdates.length === 0) return;
    const latest = notesUpdates[notesUpdates.length - 1];
    setSavedNotes((prev) => [`${latest.userId}: ${latest.note}`, ...prev].slice(0, 20));
  }, [notesUpdates]);

  useEffect(() => {
    if (runResults.length === 0) return;
    const latest = runResults[runResults.length - 1];
    setRunHistory((prev) => {
      if (prev.some((item) => item.runId === latest.runId)) return prev;
      return [
        {
          runId: latest.runId,
          status: latest.status as ExecutionRunResult['status'],
          stdout: '',
          stderr: '',
          tests: (latest.tests ?? []) as ExecutionRunResult['tests'],
        },
        ...prev,
      ].slice(0, 10);
    });
  }, [runResults]);

  const getOrCreatePeerConnection = useCallback((targetUserId: string) => {
    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) return existing;

    const peerConnection = new RTCPeerConnection({
      iceServers: rtcConfig?.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      emitWebRtcIceCandidate(targetUserId, event.candidate.toJSON());
    };

    peerConnection.ontrack = (event) => {
      const inbound = event.streams[0];
      if (!inbound) return;
      setRemoteStreams((prev) => ({ ...prev, [targetUserId]: inbound }));
    };

    peerConnectionsRef.current.set(targetUserId, peerConnection);
    return peerConnection;
  }, [emitWebRtcIceCandidate, localStream, rtcConfig?.iceServers]);

  useEffect(() => {
    if (!user?.id || !localStream) return;

    const otherUsers = participants.filter((participant) => participant.userId !== user.id);
    otherUsers.forEach(async (participant) => {
      if (peerConnectionsRef.current.has(participant.userId)) return;
      const peerConnection = getOrCreatePeerConnection(participant.userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      emitWebRtcOffer(participant.userId, offer);
    });
  }, [participants, user?.id, localStream, getOrCreatePeerConnection, emitWebRtcOffer]);

  useEffect(() => {
    if (rtcOffers.length === 0 || !user?.id) return;
    const latest = rtcOffers[rtcOffers.length - 1];
    if (latest.fromUserId === user.id) return;

    (async () => {
      const peerConnection = getOrCreatePeerConnection(latest.fromUserId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(latest.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      emitWebRtcAnswer(latest.fromUserId, answer);
    })();
  }, [rtcOffers, user?.id, getOrCreatePeerConnection, emitWebRtcAnswer]);

  useEffect(() => {
    if (rtcAnswers.length === 0 || !user?.id) return;
    const latest = rtcAnswers[rtcAnswers.length - 1];
    if (latest.fromUserId === user.id) return;

    const peerConnection = peerConnectionsRef.current.get(latest.fromUserId);
    if (!peerConnection) return;
    void peerConnection.setRemoteDescription(new RTCSessionDescription(latest.answer));
  }, [rtcAnswers, user?.id]);

  useEffect(() => {
    if (rtcIceCandidates.length === 0 || !user?.id) return;
    const latest = rtcIceCandidates[rtcIceCandidates.length - 1];
    if (latest.fromUserId === user.id) return;

    const peerConnection = peerConnectionsRef.current.get(latest.fromUserId);
    if (!peerConnection) return;
    void peerConnection.addIceCandidate(new RTCIceCandidate(latest.candidate));
  }, [rtcIceCandidates, user?.id]);

  const handleCodeChange = useCallback((newCode: string): void => {
    setCode(newCode);
    emitCodeChange(newCode, language);
  }, [emitCodeChange, language]);

  const handleRun = useCallback(async () => {
    if (!problem || isRunning) return;
    const token = Date.now();
    runTokenRef.current = token;
    setIsRunning(true);
    try {
      emitRunRequest(language);
      const result = await runProblemExecution({
        problemId: problem.id,
        code,
        language,
        stdin: stdin || undefined,
        sessionContext: { sessionId },
      });

      if (runTokenRef.current !== token) return;

      let finalResult = result;
      if (result.status === 'PENDING' || result.status === 'RUNNING') {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const polled = await getExecutionRunStatus(result.runId);
          finalResult = polled;
          if (polled.status !== 'PENDING' && polled.status !== 'RUNNING') break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setRunResult(finalResult);
      setRunHistory((prev) => [finalResult, ...prev].slice(0, 10));
      emitRunResult(finalResult.runId, finalResult.status, finalResult.tests);
    } finally {
      if (runTokenRef.current === token) {
        setIsRunning(false);
      }
    }
  }, [problem, isRunning, code, language, stdin, sessionId, emitRunRequest, emitRunResult]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleRun();
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setLeftCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun]);

  const saveNote = async () => {
    if (!sessionId || !note.trim()) return;
    await saveInterviewNote(sessionId, note.trim());
    emitNotesUpdate(note.trim());
    setSavedNotes((prev) => [note.trim(), ...prev]);
    setNote('');
    setToast('Note saved.');
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    emitChatMessage(chatInput.trim());
    setChatInput('');
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setToast('Invite link copied.');
  };

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream, muted]);

  const downloadLastRun = () => {
    if (!runResult) return;
    const payload = [
      `RunId: ${runResult.runId}`,
      `Status: ${runResult.status}`,
      'stdout:',
      runResult.stdout,
      'stderr:',
      runResult.stderr,
      'tests:',
      ...runResult.tests.map((test) => `${test.name ?? test.id ?? 'test'} => ${test.status}`),
    ].join('\n');
    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `session-run-${runResult.runId}.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const endSession = async () => {
    if (!sessionId) return;
    if (user?.role !== 'INTERVIEWER') {
      setToast('Only interviewers can end a session.');
      return;
    }
    setRatingOpen(true);
  };

  const submitRatings = async () => {
    if (!sessionId || ratingsSaving) return;
    setRatingsSaving(true);
    try {
      await submitInterviewRatings(sessionId, {
        scores: {
          problemSolving: ratings.problemSolving,
          communication: ratings.communication,
          codeQuality: ratings.codeQuality,
          collaboration: ratings.collaboration,
        },
        feedback,
      });

      await endInterview(sessionId);
      await createReport(sessionId);
      emitRatingSubmit({
        problemSolving: ratings.problemSolving,
        communication: ratings.communication,
        codeQuality: ratings.codeQuality,
        collaboration: ratings.collaboration,
      });
      setRatingOpen(false);
      navigate(`/report/${sessionId}`);
    } finally {
      setRatingsSaving(false);
    }
  };

  const testsSummary = useMemo(() => {
    if (!runResult) return 'No runs yet';
    const passed = runResult.tests.filter((item) => item.status === 'PASSED').length;
    return `${passed}/${runResult.tests.length} tests passed`;
  }, [runResult]);

  if (joinLoading) {
    return <AnimatedPage><div className={styles.loading}>Joining interview session...</div></AnimatedPage>;
  }

  if (joinError) {
    return <AnimatedPage><div className={styles.loading}>Unable to join: {joinError}</div></AnimatedPage>;
  }

  if (!session || !problem) {
    return <AnimatedPage><div className={styles.loading}>Loading interview data...</div></AnimatedPage>;
  }

  return (
    <AnimatedPage>
      <div className={styles.room}>
        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            <button className={styles.backBtn} onClick={() => navigate('/sessions')} type="button">
              <ArrowLeft size={16} />
            </button>
            <div className={styles.sessionInfo}>
              <h2 className={styles.sessionTitle}>{session.title}</h2>
              <div className={styles.sessionMeta}>
                <StatusBadge status={session.status} />
                <span className={styles.timer}><Clock size={12} /> {elapsed}</span>
                <span className={styles.token}>token: {joinToken.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className={styles.topRight}>
            <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <div className={styles.panelToggle}>RTC: {rtcReady ? 'Ready' : 'Pending'}</div>
            <button className={styles.panelToggle} onClick={() => setLeftCollapsed((prev) => !prev)} type="button">
              {leftCollapsed ? 'Show Problem' : 'Hide Problem'}
            </button>
            <button className={styles.panelToggle} onClick={() => setRecording((prev) => !prev)} type="button">
              <Video size={14} /> {recording ? 'Recording On' : 'Recording Off'}
            </button>
            <button className={styles.endBtn} onClick={endSession} type="button">
              <Square size={12} /> End Session
            </button>
          </div>
        </header>

        <div className={styles.mainArea}>
          {!leftCollapsed && (
            <aside className={styles.problemPanel}>
              <div className={styles.problemContent}>
                <div className={styles.problemHeader}>
                  <h3>{problem.title}</h3>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>
                <p className={styles.problemDesc}>{problem.statement ?? problem.description}</p>
                {problem.constraints && (
                  <div className={styles.constraints}>
                    <h4>Constraints</h4>
                    <pre>{problem.constraints}</pre>
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className={styles.editorPanel}>
            <div className={styles.editorToolbar}>
              <select
                className={styles.langSelect}
                value={language}
                onChange={(event) => {
                  const next = event.target.value as Language;
                  setLanguage(next);
                  setCode(problem.templates?.find((item) => item.language === next)?.code ?? '# Start coding\n');
                }}
              >
                {problem.supportedLangs.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <div className={styles.editorActions}>
                <button className={styles.runBtn} onClick={handleRun} disabled={isRunning} type="button">
                  {isRunning ? <><Clock size={14} /> Running...</> : <><Play size={14} /> Run</>}
                </button>
              </div>
            </div>

            <textarea
              className={styles.codeEditor}
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />

            <div className={styles.stdinRow}>
              <label htmlFor="session-stdin">stdin</label>
              <textarea id="session-stdin" className={styles.stdinInput} value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Optional input" />
            </div>

            <div className={styles.outputPanel}>
              <div className={styles.outputHeader}><Terminal size={14} /><span>Output</span></div>
              <div className={styles.outputBody}>
                {runResult ? (
                  <div className={styles.outputResult}>
                    <span>{runResult.status}</span>
                    <span>{testsSummary}</span>
                    <button type="button" className={styles.downloadBtn} onClick={downloadLastRun}><Download size={12} /> logs</button>
                  </div>
                ) : (
                  <span className={styles.outputPlaceholder}>Run your code to see output here</span>
                )}
              </div>
              {runResult && (
                <div className={styles.outputLogs}>
                  <pre>{runResult.stdout || 'No stdout output.'}</pre>
                  {runResult.stderr && <pre className={styles.errLog}>{runResult.stderr}</pre>}
                </div>
              )}
            </div>

            <Card className={styles.historyCard}>
              <h4>Execution History</h4>
              {runHistory.length === 0 && <div className={styles.emptyNote}>No executions yet.</div>}
              {runHistory.map((item) => (
                <div key={item.runId} className={styles.historyRow}>
                  <span>{item.runId}</span>
                  <span>{item.status}</span>
                </div>
              ))}
            </Card>
          </div>

          <aside className={styles.rightPanel}>
            <Card className={styles.videoCard}>
              <h4>Video Grid</h4>
              <div className={styles.videoGrid}>
                <video
                  className={styles.videoTile}
                  autoPlay
                  muted
                  playsInline
                  ref={(node) => {
                    if (!node || !localStream) return;
                    node.srcObject = localStream;
                  }}
                />
                {participants.map((item) => (
                  <video
                    key={item.userId}
                    className={styles.videoTile}
                    autoPlay
                    playsInline
                    ref={(node) => {
                      if (!node) return;
                      node.srcObject = remoteStreams[item.userId] ?? null;
                    }}
                  />
                ))}
              </div>
            </Card>

            <Card className={styles.chatCard}>
              <div className={styles.chatHeader}><MessageSquare size={14} /> Chat</div>
              <div className={styles.chatList}>
                {chatMessages.length === 0 && <div className={styles.emptyNote}>No messages yet.</div>}
                {chatMessages.map((msg) => (
                  <div key={`${msg.userId}-${msg.timestamp}`} className={styles.chatRow}>
                    <strong>{msg.displayName}</strong>
                    <span>{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className={styles.chatComposer}>
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Send message" />
                <button type="button" onClick={sendMessage}><Send size={12} /></button>
              </div>
            </Card>

            <Card className={styles.notesCard}>
              <div className={styles.chatHeader}>Notes</div>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className={styles.noteArea} placeholder="Capture observations..." />
              <button type="button" className={styles.saveBtn} onClick={saveNote}><Save size={12} /> Save Note</button>
              {savedNotes.map((item, index) => <div key={`${item}-${index}`} className={styles.savedNote}>{item}</div>)}
            </Card>

            <Card className={styles.activityCard}>
              <button type="button" className={styles.activityToggle} onClick={() => setActivityOpen((prev) => !prev)}>
                Activity Log {activityOpen ? 'Hide' : 'Show'}
              </button>
              {activityOpen && (
                <div className={styles.activityList}>
                  {antiCheatAlerts.length === 0 && <div className={styles.emptyNote}>No activity events.</div>}
                  {antiCheatAlerts.slice(-12).map((alert, index) => (
                    <div key={`${alert.eventType}-${index}`} className={styles.activityRow}>
                      <span>{alert.eventType}</span>
                      <span>sev {alert.severity ?? 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>

        <div className={styles.floatingToolbar}>
          <button type="button" className={styles.floatBtn} onClick={() => setMuted((prev) => !prev)}>
            {muted ? <MicOff size={14} /> : <Mic size={14} />} {muted ? 'Unmute' : 'Mute'}
          </button>
          <button type="button" className={styles.floatBtn} onClick={copyInviteLink}><Copy size={14} /> Copy Invite</button>
          <button type="button" className={styles.floatBtn} onClick={() => setToast('Hand raised.')}>Raise Hand</button>
        </div>

        <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} title="End Session Rating">
          <div className={styles.modalBody}>
            {(['problemSolving', 'communication', 'codeQuality', 'collaboration'] as const).map((key) => (
              <label key={key} className={styles.ratingRow}>
                <span>{key}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={ratings[key]}
                  onChange={(event) => setRatings((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                />
                <strong>{ratings[key]}</strong>
              </label>
            ))}
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className={styles.feedbackArea} placeholder="Feedback" />
            <div className={styles.modalActions}>
              <button type="button" className={styles.panelToggle} onClick={() => setRatingOpen(false)}>Cancel</button>
              <button type="button" className={styles.endBtn} onClick={submitRatings} disabled={ratingsSaving}>
                {ratingsSaving ? 'Submitting...' : 'Submit & End'}
              </button>
            </div>
          </div>
        </Modal>

        {toast && (
          <AnimatePresence>
            <motion.div className={styles.toast} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {toast}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AnimatedPage>
  );
}
