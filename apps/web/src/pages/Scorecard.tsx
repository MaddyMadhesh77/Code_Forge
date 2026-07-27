import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, ChevronLeft, Trophy } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { submitScorecard, getScorecardReport } from '../services/api';
import type { ScorecardReport } from '../types';
import styles from './Scorecard.module.css';

interface RatingFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function RatingField({ label, value, onChange }: RatingFieldProps) {
  return (
    <div className={styles.ratingField}>
      <span className={styles.ratingLabel}>{label}</span>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className={styles.starBtn}>
            <Star size={20} className={n <= value ? styles.starFilled : styles.starEmpty} />
          </button>
        ))}
        <span className={styles.ratingNum}>{value}/5</span>
      </div>
    </div>
  );
}

export function Scorecard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ScorecardReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<'submit' | 'report'>('submit');

  const [scores, setScores] = useState({
    problemSolving: 3,
    communication: 3,
    debugging: 3,
    codeQuality: 3,
    timeManagement: 3,
    testingApproach: 3,
    overallRating: 3,
  });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    getScorecardReport(sessionId).then(setReport);
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setSubmitting(true);
    await submitScorecard(sessionId, { ...scores, feedback });
    setSubmitting(false);
    setSubmitted(true);
    getScorecardReport(sessionId).then(setReport);
  };

  const set = (key: keyof typeof scores) => (v: number) =>
    setScores((prev) => ({ ...prev, [key]: v }));

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/sessions')} type="button">
            <ChevronLeft size={16} /> Back
          </button>
          <h1>Scorecard</h1>
          <p className={styles.subtitle}>Session: {sessionId}</p>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'submit' ? styles.activeTab : ''}`} onClick={() => setTab('submit')} type="button">Submit Score</button>
          <button className={`${styles.tab} ${tab === 'report' ? styles.activeTab : ''}`} onClick={() => setTab('report')} type="button">Scorecard Report</button>
        </div>

        {tab === 'submit' && (
          <Card>
            {submitted ? (
              <motion.div className={styles.success} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Trophy size={40} className={styles.trophy} />
                <h2>Scorecard Submitted!</h2>
                <p>Your evaluation has been recorded.</p>
                <button className={styles.reportBtn} onClick={() => setTab('report')} type="button">View Report</button>
              </motion.div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <h2 className={styles.formTitle}>Evaluate Candidate</h2>
                <RatingField label="Problem Solving" value={scores.problemSolving} onChange={set('problemSolving')} />
                <RatingField label="Communication" value={scores.communication} onChange={set('communication')} />
                <RatingField label="Debugging" value={scores.debugging} onChange={set('debugging')} />
                <RatingField label="Code Quality" value={scores.codeQuality} onChange={set('codeQuality')} />
                <RatingField label="Time Management" value={scores.timeManagement} onChange={set('timeManagement')} />
                <RatingField label="Testing Approach" value={scores.testingApproach} onChange={set('testingApproach')} />
                <RatingField label="Overall Rating" value={scores.overallRating} onChange={set('overallRating')} />
                <div className={styles.feedbackGroup}>
                  <label className={styles.feedbackLabel}>Feedback (optional)</label>
                  <textarea className={styles.feedbackArea} rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Additional notes about the candidate..." />
                </div>
                <button className={styles.submitBtn} type="submit" disabled={submitting}>
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Scorecard'}
                </button>
              </form>
            )}
          </Card>
        )}

        {tab === 'report' && (
          <Card>
            {!report ? (
              <p className={styles.empty}>No scorecards submitted yet.</p>
            ) : (
              <div className={styles.report}>
                <h2 className={styles.formTitle}>Aggregate Report</h2>
                <div className={styles.reportMeta}>
                  <span>Total Interviewers: <strong>{report.totalInterviewers}</strong></span>
                  <span>Best Criteria: <strong className={styles.best}>{report.highestRatedCriteria}</strong></span>
                  <span>Weakest Criteria: <strong className={styles.worst}>{report.lowestRatedCriteria}</strong></span>
                </div>
                <div className={styles.avgGrid}>
                  {Object.entries(report.averageScores).map(([key, val]) => (
                    <div key={key} className={styles.avgItem}>
                      <span className={styles.avgKey}>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <div className={styles.avgBar}>
                        <div className={styles.avgFill} style={{ width: `${(val / 5) * 100}%` }} />
                      </div>
                      <span className={styles.avgVal}>{typeof val === 'number' ? val.toFixed(1) : val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AnimatedPage>
  );
}
