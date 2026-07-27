import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, Share2, Download, XCircle, Clock, RefreshCw } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import {
  getReport, createReport, extendShareLink, revokeShareLink, exportInterview,
} from '../services/api';
import type { InterviewReport } from '../types';
import styles from './Report.module.css';

export function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const r = await getReport(sessionId);
    setReport(r);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!sessionId) return;
    setLoading(true);
    const r = await createReport(sessionId);
    setReport(r);
    setLoading(false);
  };

  const handleExtend = async () => {
    if (!sessionId) return;
    const r = await extendShareLink(sessionId, 30 * 86400);
    setReport(r);
  };

  const handleRevoke = async () => {
    if (!sessionId) return;
    const r = await revokeShareLink(sessionId);
    setReport(r);
  };

  const handleCopy = () => {
    if (!report?.shareToken) return;
    const url = `${window.location.origin}/public-report/${report.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'PDF' | 'JSON') => {
    if (!sessionId) return;
    setExporting(true);
    setExportMsg('');
    const result = await exportInterview(sessionId, format, false);
    setExporting(false);
    if (result) {
      setExportMsg(`Export ready (${format}).`);
    } else {
      setExportMsg('Export failed or backend unavailable.');
    }
  };

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/sessions')} type="button">
            <ChevronLeft size={16} /> Back
          </button>
          <h1>Interview Report</h1>
          <p className={styles.subtitle}>Session: {sessionId}</p>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading report...</p>
        ) : !report ? (
          <Card>
            <div className={styles.emptyState}>
              <FileText size={48} className={styles.emptyIcon} />
              <h2>No Report Yet</h2>
              <p>Generate a report to share results with your team.</p>
              <button className={styles.primaryBtn} onClick={handleCreate} type="button">
                <FileText size={14} /> Generate Report
              </button>
            </div>
          </Card>
        ) : (
          <motion.div className={styles.content} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}><FileText size={16} /> Report Details</h2>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Generated</span>
                  <span className={styles.detailVal}>{new Date(report.generatedAt).toLocaleString()}</span>
                </div>
                {report.summary && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Summary</span>
                    <span className={styles.detailVal}>{report.summary}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}><Share2 size={16} /> Share Link</h2>
                {report.shareToken ? (
                  <>
                    <div className={styles.shareBox}>
                      <code className={styles.shareUrl}>
                        {window.location.origin}/public-report/{report.shareToken}
                      </code>
                      <button className={styles.copyBtn} onClick={handleCopy} type="button">
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    {report.shareExpiry && (
                      <p className={styles.expiry}>
                        <Clock size={12} /> Expires: {new Date(report.shareExpiry).toLocaleDateString()}
                      </p>
                    )}
                    <div className={styles.linkActions}>
                      <button className={styles.secondaryBtn} onClick={handleExtend} type="button">
                        <RefreshCw size={13} /> Extend 30 Days
                      </button>
                      <button className={styles.dangerBtn} onClick={handleRevoke} type="button">
                        <XCircle size={13} /> Revoke Link
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.revokedState}>
                    <XCircle size={20} className={styles.revokedIcon} />
                    <span>Share link has been revoked.</span>
                    <button className={styles.secondaryBtn} onClick={handleCreate} type="button">Regenerate</button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}><Download size={16} /> Export</h2>
                <div className={styles.exportActions}>
                  <button className={styles.exportBtn} onClick={() => handleExport('JSON')} disabled={exporting} type="button">
                    Export JSON
                  </button>
                  <button className={styles.exportBtn} onClick={() => handleExport('PDF')} disabled={exporting} type="button">
                    Export PDF
                  </button>
                </div>
                {exportMsg && <p className={styles.exportMsg}>{exportMsg}</p>}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
}
