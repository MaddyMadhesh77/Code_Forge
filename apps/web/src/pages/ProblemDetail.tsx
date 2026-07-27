import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Copy, Download, Lightbulb, Play, Share2, SquarePen, Users } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { DifficultyBadge, LangBadge } from '../components/ui/Badge';
import Modal from '../components/Modal';
import {
  bookmarkProblem,
  getProblemBySlug,
  getProblemDetailById,
  getProblemHints,
  getProblemSolutions,
  getProblems,
  getExecutionRunStatus,
  runProblemExecution,
  startInterviewFromProblem,
  updateProblem,
} from '../services/api';
import type { ExecutionRunResult, Language, Problem } from '../types';
import styles from './ProblemDetail.module.css';

type InterviewMode = 'live' | 'pair' | 'practice';

function getTemplate(problem: Problem, language: Language): string {
  const template = problem.templates?.find((item) => item.language === language);
  if (template?.code) {
    return template.code;
  }
  if (language === 'python') return 'def solve():\n    pass\n';
  if (language === 'javascript') return 'function solve() {\n  // TODO\n}\n';
  if (language === 'java') return 'class Solution {\n  public void solve() {\n    // TODO\n  }\n}\n';
  return 'int main() {\n  return 0;\n}\n';
}

function mapSlugToId(slug: string, problems: Problem[]): string | null {
  const matched = problems.find((item) => item.slug === slug);
  return matched?.id ?? null;
}

export function ProblemDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const runTokenRef = useRef(0);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('python');
  const [templateLoading, setTemplateLoading] = useState(true);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState<ExecutionRunResult | null>(null);
  const [runHistory, setRunHistory] = useState<ExecutionRunResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [hints, setHints] = useState<string[] | null>(null);
  const [solutions, setSolutions] = useState<Array<{ language: string; code: string; title?: string }> | null>(null);
  const [relatedProblems, setRelatedProblems] = useState<Problem[]>([]);
  const [section, setSection] = useState<'editorial' | 'discussion'>('editorial');
  const [toast, setToast] = useState<string>('');

  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('live');
  const [participantIds, setParticipantIds] = useState('');
  const [startingInterview, setStartingInterview] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStatement, setEditStatement] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    async function loadProblem(): Promise<void> {
      setLoading(true);
      const all = await getProblems();
      const problemId = mapSlugToId(id, all) ?? id;
      const detail = await getProblemDetailById(problemId);
      const bySlug = detail ?? (await getProblemBySlug(id)) ?? null;

      if (!mounted) return;
      setProblem(bySlug);
      setRelatedProblems(all.filter((item) => item.id !== bySlug?.id).slice(0, 5));

      if (bySlug) {
        const firstLanguage = bySlug.templates?.[0]?.language ?? bySlug.supportedLangs[0] ?? 'python';
        const nextLanguage = firstLanguage as Language;
        setLanguage(nextLanguage);
        setCode(getTemplate(bySlug, nextLanguage));
        setEditTitle(bySlug.title);
        setEditStatement(bySlug.statement ?? bySlug.description);
      }

      setTemplateLoading(false);
      setLoading(false);
    }

    loadProblem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleLanguageChange = useCallback((next: Language) => {
    setLanguage(next);
    if (!problem) return;
    setTemplateLoading(true);
    setCode(getTemplate(problem, next));
    setTemplateLoading(false);
  }, [problem]);

  const handleRun = useCallback(async () => {
    if (!problem || !code.trim() || isRunning) {
      if (!code.trim()) setToast('Code cannot be empty.');
      return;
    }

    const token = Date.now();
    runTokenRef.current = token;
    setIsRunning(true);
    setShowCancel(false);

    window.setTimeout(() => {
      if (runTokenRef.current === token && isRunning) setShowCancel(true);
    }, 1800);

    try {
      const result = await runProblemExecution({
        problemId: problem.id,
        code,
        language,
        stdin: stdin.trim() || undefined,
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
      setRunHistory((prev) => [finalResult, ...prev].slice(0, 12));
    } catch {
      if (runTokenRef.current !== token) return;
      setRunResult({
        runId: `run-error-${Date.now()}`,
        status: 'FAILED',
        stdout: '',
        stderr: 'Unable to execute code. Please retry.',
        tests: [],
      });
    } finally {
      if (runTokenRef.current === token) {
        setIsRunning(false);
        setShowCancel(false);
      }
    }
  }, [problem, code, language, stdin, isRunning]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isRunShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
      if (!isRunShortcut) return;
      event.preventDefault();
      handleRun();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun]);

  const handleCancelRun = () => {
    runTokenRef.current = Date.now();
    setIsRunning(false);
    setShowCancel(false);
    setToast('Run cancelled.');
  };

  const loadHints = async () => {
    if (!problem || hints) return;
    const items = await getProblemHints(problem.id);
    setHints(items);
  };

  const loadSolutions = async () => {
    if (!problem || solutions) return;
    const items = await getProblemSolutions(problem.id, language);
    setSolutions(items);
  };

  const toggleBookmark = async () => {
    if (!problem) return;
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await bookmarkProblem(problem.id);
    } catch {
      setBookmarked(!next);
      setToast('Bookmark failed.');
    }
  };

  const handleFork = async () => {
    if (!problem) return;
    const template = getTemplate(problem, language);
    await navigator.clipboard.writeText(template);
    setToast('Current template copied.');
  };

  const handleCopyStatement = async () => {
    if (!problem) return;
    await navigator.clipboard.writeText(problem.statement ?? problem.description);
    setToast('Statement copied.');
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setToast('Link copied.');
  };

  const downloadLogs = () => {
    if (!runResult) return;
    const payload = [
      `Run: ${runResult.runId}`,
      `Status: ${runResult.status}`,
      '--- stdout ---',
      runResult.stdout,
      '--- stderr ---',
      runResult.stderr,
      '--- tests ---',
      ...runResult.tests.map((test) => `${test.name ?? test.id ?? 'test'}: ${test.status}`),
    ].join('\n');

    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `run-${runResult.runId}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const startInterview = async () => {
    if (!problem || startingInterview) return;
    setStartingInterview(true);
    try {
      const ids = participantIds
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const created = await startInterviewFromProblem({ problemId: problem.id, participantIds: ids, mode: interviewMode });
      setInterviewModalOpen(false);
      navigate(`/sessions/${created.sessionId}`);
    } finally {
      setStartingInterview(false);
    }
  };

  const saveEdit = async () => {
    if (!problem || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await updateProblem(problem.id, {
        title: editTitle.trim(),
        statement: editStatement.trim(),
        difficulty: problem.difficulty,
        tags: problem.tags ?? [],
      });
      setProblem((prev) => (prev
        ? {
          ...prev,
          title: editTitle.trim(),
          statement: editStatement.trim(),
          description: editStatement.trim(),
        }
        : prev));
      setEditModalOpen(false);
      setToast('Problem updated.');
    } finally {
      setSavingEdit(false);
    }
  };

  const testsPassed = useMemo(
    () => runResult?.tests.filter((item) => item.status === 'PASSED').length ?? 0,
    [runResult],
  );

  if (loading) {
    return (
      <AnimatedPage>
        <div className={styles.skeletonPage}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonBody} />
        </div>
      </AnimatedPage>
    );
  }

  if (!problem) {
    return (
      <AnimatedPage>
        <div className={styles.notFound}>Problem not found.</div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <Link to="/problems" className={styles.backLink}><ArrowLeft size={15} /> Back to Problems</Link>

        <header className={styles.header}>
          <div>
            <h1>{problem.title}</h1>
            <div className={styles.meta}>
              <DifficultyBadge difficulty={problem.difficulty} />
              {(problem.tags ?? []).slice(0, 4).map((tag) => <span key={tag} className={styles.tagPill}>{tag}</span>)}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.primaryBtn} type="button" onClick={() => setInterviewModalOpen(true)}>
              <Users size={14} /> Start Interview
            </button>
            <button className={styles.secondaryBtn} type="button" onClick={handleFork}>Fork</button>
            <button className={styles.secondaryBtn} type="button" onClick={() => setEditModalOpen(true)}><SquarePen size={14} /> Edit</button>
            <button className={styles.secondaryBtn} type="button" onClick={toggleBookmark}><Bookmark size={14} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}</button>
          </div>
        </header>

        <div className={styles.mainLayout}>
          <Card className={styles.leftCard}>
            <section>
              <h3 className={styles.sectionTitle}>Description</h3>
              <p className={styles.content}>{problem.statement ?? problem.description}</p>
            </section>

            <section>
              <h3 className={styles.sectionTitle}>Constraints</h3>
              <pre className={styles.monoContent}>{problem.constraints ?? 'No explicit constraints provided.'}</pre>
            </section>

            <section>
              <h3 className={styles.sectionTitle}>Examples</h3>
              {(problem.samples ?? []).length === 0 && <div className={styles.emptyState}>No examples available.</div>}
              {(problem.samples ?? []).map((sample, idx) => (
                <div key={`${sample.input}-${idx}`} className={styles.sampleBox}>
                  <div><strong>Input:</strong> {sample.input}</div>
                  <div><strong>Output:</strong> {sample.output}</div>
                  {sample.explanation && <div><strong>Explanation:</strong> {sample.explanation}</div>}
                </div>
              ))}
            </section>

            <section>
              <h3 className={styles.sectionTitle}>Notes</h3>
              <p className={styles.content}>{problem.notes ?? 'Think about edge cases and test with minimum/maximum bounds.'}</p>
            </section>

            <section>
              <div className={styles.toggleRow}>
                <button type="button" className={`${styles.toggleBtn} ${section === 'editorial' ? styles.activeToggle : ''}`} onClick={() => setSection('editorial')}>Editorial</button>
                <button type="button" className={`${styles.toggleBtn} ${section === 'discussion' ? styles.activeToggle : ''}`} onClick={() => setSection('discussion')}>Discussion</button>
              </div>
              {section === 'editorial' ? (
                <p className={styles.content}>{problem.editorial ?? 'Editorial unavailable.'}</p>
              ) : (
                <p className={styles.content}>Discussion threads are not yet available in this environment.</p>
              )}
            </section>
          </Card>

          <div className={styles.rightColumn}>
            <Card className={styles.editorCard}>
              <div className={styles.editorToolbar}>
                <div className={styles.languageTabs}>
                  {problem.supportedLangs.map((lang) => (
                    <button
                      key={lang}
                      className={`${styles.langTab} ${language === lang ? styles.langTabActive : ''}`}
                      type="button"
                      onClick={() => handleLanguageChange(lang)}
                    >
                      <LangBadge lang={lang} />
                    </button>
                  ))}
                </div>
                <div className={styles.runActions}>
                  {showCancel && (
                    <button type="button" className={styles.cancelBtn} onClick={handleCancelRun}>Cancel</button>
                  )}
                  <button type="button" className={styles.runBtn} onClick={handleRun} disabled={isRunning}>
                    <Play size={14} /> {isRunning ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>

              {templateLoading ? (
                <div className={styles.editorSkeleton} />
              ) : (
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className={styles.codeEditor}
                  spellCheck={false}
                  aria-label="Code editor"
                />
              )}

              <div className={styles.stdinRow}>
                <label htmlFor="stdin" className={styles.stdinLabel}>stdin (optional)</label>
                <textarea
                  id="stdin"
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  className={styles.stdinEditor}
                  placeholder="Input to pass into your program"
                />
              </div>
              <div className={styles.shortcutNote}>Run shortcut: Ctrl/Cmd + Enter</div>
            </Card>

            <Card className={styles.consoleCard}>
              <div className={styles.consoleHeader}>
                <h4>Run Console</h4>
                <button type="button" className={styles.smallBtn} onClick={downloadLogs} disabled={!runResult}><Download size={12} /> Download Logs</button>
              </div>
              {!runResult && <div className={styles.emptyState}>Run your code to see stdout/stderr and test results.</div>}
              {runResult && (
                <>
                  <div className={styles.resultMeta}>
                    <span>Status: {runResult.status}</span>
                    <span>Tests: {testsPassed}/{runResult.tests.length}</span>
                  </div>
                  <pre className={styles.consoleBlock}>{runResult.stdout || 'No stdout output.'}</pre>
                  {runResult.stderr && <pre className={`${styles.consoleBlock} ${styles.errorBlock}`}>{runResult.stderr}</pre>}
                  <div className={styles.testsList}>
                    {runResult.tests.map((test) => (
                      <div key={test.id ?? test.name} className={styles.testRow}>
                        <span>{test.name ?? test.id ?? 'Test'}</span>
                        <span className={`${styles.testBadge} ${test.status === 'PASSED' ? styles.pass : styles.fail}`}>{test.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>

        <div className={styles.bottomSections}>
          <Card>
            <div className={styles.sectionHeadRow}>
              <h3>Hints</h3>
              <button type="button" className={styles.smallBtn} onClick={loadHints}><Lightbulb size={12} /> Request Hint</button>
            </div>
            {!hints && <div className={styles.emptyState}>Hints are loaded on demand.</div>}
            {hints && hints.map((hint, index) => <div key={`${hint}-${index}`} className={styles.listRow}>{index + 1}. {hint}</div>)}
          </Card>

          <Card>
            <div className={styles.sectionHeadRow}>
              <h3>Solutions</h3>
              <button type="button" className={styles.smallBtn} onClick={loadSolutions}>Load Solutions</button>
            </div>
            {!solutions && <div className={styles.emptyState}>Solutions are optional and loaded on demand.</div>}
            {solutions?.map((solution, idx) => (
              <div key={`${solution.language}-${idx}`} className={styles.solutionRow}>
                <strong>{solution.title ?? solution.language}</strong>
                <pre className={styles.consoleBlock}>{solution.code}</pre>
              </div>
            ))}
          </Card>

          <Card>
            <h3>Related Problems</h3>
            {relatedProblems.length === 0 && <div className={styles.emptyState}>No related problems found.</div>}
            {relatedProblems.map((item) => (
              <Link key={item.id} to={`/problems/${item.id}`} className={styles.relatedLink}>{item.title}</Link>
            ))}
          </Card>

          {runHistory.length > 0 && (
            <Card>
              <h3>Recent Runs</h3>
              {runHistory.map((item) => (
                <div key={item.runId} className={styles.listRow}>{item.runId} - {item.status}</div>
              ))}
            </Card>
          )}
        </div>

        <div className={styles.floatingActions}>
          <button type="button" className={styles.fab} onClick={handleShare}><Share2 size={14} /> Share</button>
          <button type="button" className={styles.fab} onClick={handleCopyStatement}><Copy size={14} /> Copy</button>
        </div>

        <Modal open={interviewModalOpen} onClose={() => setInterviewModalOpen(false)} title="Start Interview">
          <div className={styles.modalBody}>
            <label className={styles.modalLabel}>Participant IDs (comma separated)</label>
            <input value={participantIds} onChange={(event) => setParticipantIds(event.target.value)} className={styles.modalInput} placeholder="user-1, user-2" />
            <label className={styles.modalLabel}>Mode</label>
            <select value={interviewMode} onChange={(event) => setInterviewMode(event.target.value as InterviewMode)} className={styles.modalInput}>
              <option value="live">Live</option>
              <option value="pair">Pair</option>
              <option value="practice">Practice</option>
            </select>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setInterviewModalOpen(false)}>Cancel</button>
              <button type="button" className={styles.primaryBtn} onClick={startInterview} disabled={startingInterview}>
                {startingInterview ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Problem">
          <div className={styles.modalBody}>
            <label className={styles.modalLabel}>Title</label>
            <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className={styles.modalInput} />
            <label className={styles.modalLabel}>Statement</label>
            <textarea value={editStatement} onChange={(event) => setEditStatement(event.target.value)} className={styles.modalTextarea} />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button type="button" className={styles.primaryBtn} onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>

        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    </AnimatedPage>
  );
}
