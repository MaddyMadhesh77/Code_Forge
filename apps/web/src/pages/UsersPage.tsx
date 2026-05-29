import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MailPlus, Search, UserMinus, Users } from 'lucide-react';
import Modal from '../components/Modal';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { deleteUser, getUserActivity, getUsers, inviteUser, updateUser } from '../services/api';
import type { Role, TeamUser, UserActivityItem, UserStatus } from '../types';

const roleOptions: Array<Role | ''> = ['', 'ADMIN', 'INTERVIEWER', 'CANDIDATE'];

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState<Role | ''>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('INTERVIEWER');
  const [inviteError, setInviteError] = useState('');
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [activity, setActivity] = useState<UserActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TeamUser | null>(null);
  const [savingUserId, setSavingUserId] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    const response = await getUsers({ q: query, role, page: 1 });
    setUsers(response.items);
    setTotal(response.total);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [role, query]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void loadUsers();
  }, []);

  const activeCount = useMemo(() => users.filter((user) => user.status === 'ACTIVE').length, [users]);

  const openUser = async (user: TeamUser) => {
    setSelectedUser(user);
    setActivityLoading(true);
    const result = await getUserActivity(user.id);
    setActivity(result);
    setActivityLoading(false);
  };

  const updateInline = async (user: TeamUser, patch: Partial<Pick<TeamUser, 'role' | 'status'>>) => {
    const snapshot = users;
    setUsers((current) => current.map((entry) => (entry.id === user.id ? { ...entry, ...patch } : entry)));
    setSavingUserId(user.id);
    try {
      const updated = await updateUser(user.id, patch);
      setUsers((current) => current.map((entry) => (entry.id === user.id ? { ...entry, ...updated } : entry)));
      setToast('User updated');
    } catch {
      setUsers(snapshot);
      setToast('Update failed');
    } finally {
      setSavingUserId('');
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }

    const created = await inviteUser({ email, role: inviteRole });
    setUsers((current) => [created, ...current]);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteError('');
    setToast(`Invite sent to ${email}`);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await deleteUser(pendingDelete.id);
    setUsers((current) => current.filter((user) => user.id !== pendingDelete.id));
    setPendingDelete(null);
    setToast('User removed');
  };

  const statusStyles: Record<UserStatus, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20',
    INVITED: 'bg-amber-500/15 text-amber-200 border-amber-400/20',
    SUSPENDED: 'bg-rose-500/15 text-rose-200 border-rose-400/20',
  };

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Users / Team</p>
            <h1 className="mt-1 text-3xl font-semibold text-[color:var(--text-primary)]">Manage users, roles, and access</h1>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Invite teammates, adjust roles inline, and review activity from the detail drawer.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Active users</div>
              <div className="text-xl font-semibold">{activeCount}</div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90" type="button" onClick={() => setInviteOpen(true)}>
              <MailPlus size={16} /> Invite user
            </button>
          </div>
        </div>

        <Card className="space-y-4 border-white/10 bg-white/5 p-5 text-white">
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-[color:var(--text-muted)]">
              <Users size={16} />
              <select className="w-full bg-transparent text-white outline-none" value={role} onChange={(event) => setRole(event.target.value as Role | '')}>
                {roleOptions.map((option) => (
                  <option key={option || 'all'} value={option} className="text-black">
                    {option || 'All roles'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-[color:var(--text-muted)]">
              <Search size={16} />
              <input className="w-full bg-transparent text-white outline-none placeholder:text-[color:var(--text-muted)]" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10">
            <div className="grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
              <div>Avatar</div>
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Status</div>
              <div>Last active</div>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/8" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-[color:var(--text-muted)]">No users match the current filters.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {users.map((user) => (
                  <div key={user.id} className="grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.8fr] items-center gap-3 px-4 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,rgba(94,123,255,0.4),rgba(55,65,81,0.4))] text-sm font-semibold text-white">{initials(user.displayName)}</div>
                      <div>
                        <div className="font-semibold text-white">{user.displayName}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">{user.title ?? user.department ?? 'Team member'}</div>
                      </div>
                    </div>
                    <div className="text-[color:var(--text-muted)]">{user.email}</div>
                    <select
                      className="rounded-xl border border-white/10 bg-[#0a0f1a] px-3 py-2 text-white outline-none"
                      value={user.role}
                      disabled={savingUserId === user.id}
                      onChange={(event) => updateInline(user, { role: event.target.value as Role })}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="INTERVIEWER">Interviewer</option>
                      <option value="CANDIDATE">Candidate</option>
                    </select>
                    <select
                      className={`rounded-xl border px-3 py-2 outline-none ${statusStyles[user.status]}`}
                      value={user.status}
                      disabled={savingUserId === user.id}
                      onChange={(event) => updateInline(user, { status: event.target.value as UserStatus })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INVITED">Invited</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <div className="text-[color:var(--text-muted)]">{formatDate(user.lastActiveAt)}</div>
                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10" type="button" onClick={() => void openUser(user)}>
                        Details
                      </button>
                      <button className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20" type="button" onClick={() => setPendingDelete(user)}>
                        <UserMinus size={14} className="inline-block" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">{total} total records</div>
        </Card>

        {selectedUser && (
          <motion.aside initial={{ x: 36, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="fixed right-0 top-0 z-40 h-full w-full max-w-[420px] border-l border-white/10 bg-[rgba(8,12,18,0.98)] p-6 text-white shadow-[-20px_0_80px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">User details</p>
                <h2 className="mt-1 text-2xl font-semibold">{selectedUser.displayName}</h2>
                <p className="text-sm text-[color:var(--text-muted)]">{selectedUser.email}</p>
              </div>
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" type="button" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Card className="border-white/10 bg-white/5 p-4 text-white">
                <div className="flex items-center justify-between text-sm">
                  <span>Role</span>
                  <span className="font-semibold">{selectedUser.role}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Status</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selectedUser.status]}`}>{selectedUser.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Last active</span>
                  <span>{formatDate(selectedUser.lastActiveAt)}</span>
                </div>
              </Card>

              <Card className="border-white/10 bg-white/5 p-4 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Activity</h3>
                  {activityLoading && <span className="text-xs text-[color:var(--text-muted)]">Loading…</span>}
                </div>
                <div className="mt-4 space-y-3">
                  {activity.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-3">
                      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                        <span>{entry.action}</span>
                        <span>{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/90">{entry.details}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.aside>
        )}

        <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user">
          <div className="space-y-4 text-white">
            <div>
              <label className="mb-2 block text-sm text-[color:var(--text-muted)]">Email</label>
              <input className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" />
              {inviteError && <p className="mt-2 text-sm text-rose-200">{inviteError}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm text-[color:var(--text-muted)]">Role</label>
              <select className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
                <option value="ADMIN">Admin</option>
                <option value="INTERVIEWER">Interviewer</option>
                <option value="CANDIDATE">Candidate</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </button>
              <button className="rounded-2xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void handleInvite()}>
                Send invite
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Remove user">
          <div className="space-y-4 text-white">
            <p className="text-sm text-[color:var(--text-muted)]">
              Remove {pendingDelete?.displayName} from the workspace? This uses the delete endpoint and updates the table immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" type="button" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void handleDelete()}>
                Confirm remove
              </button>
            </div>
          </div>
        </Modal>

        {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#0a0f1a] px-4 py-2 text-sm text-white shadow-xl">{toast}</div>}
      </div>
    </AnimatedPage>
  );
}
