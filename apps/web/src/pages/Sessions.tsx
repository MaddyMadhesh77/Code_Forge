import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Radio, Link2, Copy, X, FileText, ClipboardCheck, Play } from 'lucide-react';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import {
  getSessions, createSession, getSessionLinks, createSessionLink, revokeSessionLink,
} from '../services/api';
import type { InterviewSession, SessionLink, SessionRole } from '../types';
import styles from './Sessions.module.css';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

const ROLES: SessionRole[] = ['INTERVIEWER', 'CANDIDATE', 'OBSERVER'];

export function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [linksSession, setLinksSession] = useState<InterviewSession | null>(null);
  const [links, setLinks] = useState<SessionLink[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = useCallback(() => getSessions().then(setSessions), []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const s = await createSession(newTitle.trim());
    setSessions((prev) => [s, ...prev]);
    setNewTitle('');
    setCreating(false);
    setShowCreate(false);
  };

  const openLinks = async (session: InterviewSession) => {
    setLinksSession(session);
    const l = await getSessionLinks(session.id);
    setLinks(l);
  };

  const handleCreateLink = async (role: SessionRole) => {
    if (!linksSession) return;
    const link = await createSessionLink(linksSession.id, role);
    setLinks((prev) => [link, ...prev]);
  };

  const handleRevokeLink = async (linkId: string) => {
    const updated = await revokeSessionLink(linkId);
    setLinks((prev) => prev.map((l) => (l.id === linkId ? updated : l)));
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <AnimatedPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Sessions</h1>
            <p className={styles.subtitle}>Manage your interview sessions</p>
          </div>
          <button className={styles.createBtn} type="button" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Session
          </button>
        </div>

        {/* ── Create Session Modal ── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)}>
              <motion.div className={styles.modal} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>New Interview Session</h2>
                  <button className={styles.closeBtn} onClick={() => setShowCreate(false)} type="button"><X size={18} /></button>
                </div>
                <form onSubmit={handleCreate} className={styles.modalForm}>
                  <label className={styles.fieldLabel}>Session Title</label>
                  <input className={styles.input} placeholder="e.g. Senior Frontend — Round 1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required autoFocus />
                  <button className={styles.submitBtn} type="submit" disabled={creating || !newTitle.trim()}>
                    {creating ? 'Creating...' : 'Create Session'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Session Links Drawer ── */}
        <AnimatePresence>
          {linksSession && (
            <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLinksSession(null)}>
              <motion.div className={styles.drawer} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2><Link2 size={16} /> Invite Links</h2>
                  <button className={styles.closeBtn} onClick={() => setLinksSession(null)} type="button"><X size={18} /></button>
                </div>
                <p className={styles.drawerSubtitle}>{linksSession.title}</p>
                <div className={styles.roleButtons}>
                  {ROLES.map((role) => (
                    <button key={role} className={styles.roleBtn} onClick={() => handleCreateLink(role)} type="button">
                      <Plus size={13} /> {role}
                    </button>
                  ))}
                </div>
                <div className={styles.linksList}>
                  {links.length === 0 && <p className={styles.noLinks}>No links yet. Create one above.</p>}
                  {links.map((link) => (
                    <div key={link.id} className={`${styles.linkItem} ${link.isRevoked ? styles.revokedLink : ''}`}>
                      <span className={styles.linkRole}>{link.role}</span>
                      <code className={styles.linkToken}>{link.token.slice(0, 16)}…</code>
                      <div className={styles.linkActions}>
                        {!link.isRevoked && (
                          <>
                            <button className={styles.iconBtn} title="Copy link" onClick={() => copyLink(link.token)} type="button">
                              <Copy size={13} />
                              {copiedToken === link.token && <span className={styles.copiedTip}>Copied!</span>}
                            </button>
                            <button className={styles.iconBtn} title="Revoke" onClick={() => handleRevokeLink(link.id)} type="button">
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {link.isRevoked && <span className={styles.revokedTag}>Revoked</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>No sessions found</div>
        ) : (
          <motion.div className={styles.sessionsList} variants={stagger} initial="hidden" animate="show">
            {sessions.map((session) => (
              <motion.div key={session.id} variants={fadeUp}>
                <Card interactive>
                  <div className={styles.sessionCard}>
                    <div className={styles.sessionInfo}>
                      <span className={styles.sessionTitle}>{session.title}</span>
                      <span className={styles.sessionCreator}>{session.creatorName}</span>
                    </div>
                    <div className={styles.sessionTime}>
                      <span className={styles.timeLabel}>Scheduled</span>
                      {formatDate(session.scheduledAt)}
                    </div>
                    <StatusBadge status={session.status} />
                    <span className={styles.participantCount}>
                      <Users size={14} /> {session.participantCount}
                    </span>
                    <div className={styles.sessionActions}>
                      <button className={styles.iconActionBtn} title="Manage invite links" onClick={() => openLinks(session)} type="button">
                        <Link2 size={14} />
                      </button>
                      <button className={styles.iconActionBtn} title="Scorecard" onClick={() => navigate(`/scorecard/${session.id}`)} type="button">
                        <ClipboardCheck size={14} />
                      </button>
                      <button className={styles.iconActionBtn} title="Report" onClick={() => navigate(`/report/${session.id}`)} type="button">
                        <FileText size={14} />
                      </button>
                      {(session.status === 'ACTIVE' || session.status === 'SCHEDULED') && (
                        <button className={styles.joinBtn} onClick={() => navigate(`/sessions/${session.id}`)} type="button">
                          <Radio size={12} />
                          {session.status === 'ACTIVE' ? 'Join Live' : 'Enter Room'}
                        </button>
                      )}
                      <button className={styles.iconActionBtn} title="Replay" onClick={() => navigate(`/sessions/${session.id}/replay`)} type="button">
                        <Play size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
}
