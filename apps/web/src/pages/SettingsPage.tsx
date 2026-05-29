import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';
import Modal from '../components/Modal';
import { AnimatedPage } from '../components/shared/AnimatedPage';
import { Card } from '../components/ui/Card';
import { createApiKey, deleteApiKey, getApiKeys, getCurrentUserProfile, getOrgSettings, updateCurrentUserProfile, updateOrgSettings } from '../services/api';
import type { ApiKey, CurrentUserProfile, OrgSettings } from '../types';

type SettingsTab = 'profile' | 'security' | 'keys' | 'billing' | 'integrations';

const orgId = 'org-1';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const tab = useMemo<SettingsTab>(() => {
    if (location.pathname.endsWith('/security')) return 'security';
    if (location.pathname.endsWith('/keys')) return 'keys';
    return 'profile';
  }, [location.pathname]);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [keyName, setKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [passwordFields, setPasswordFields] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getCurrentUserProfile(), getApiKeys(), getOrgSettings(orgId)])
      .then(([profileData, keysData, settingsData]) => {
        if (!mounted) return;
        setProfile(profileData);
        setApiKeys(keysData);
        setOrgSettings(settingsData);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: JSX.Element }> = useMemo(() => ([
    { id: 'profile', label: 'Profile', icon: <UserCircle2 size={16} /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck size={16} /> },
    { id: 'keys', label: 'API Keys', icon: <KeyRound size={16} /> },
  ]), []);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUserProfile(profile);
      setProfile(updated);
      setToast('Profile saved');
    } finally {
      setSaving(false);
    }
  };

  const saveOrgSettings = async () => {
    if (!orgSettings) return;
    setSaving(true);
    try {
      const updated = await updateOrgSettings(orgId, orgSettings);
      setOrgSettings(updated);
      setToast('Organization settings saved');
    } finally {
      setSaving(false);
    }
  };

  const createKey = async () => {
    if (!keyName.trim()) return;
    setSaving(true);
    try {
      const created = await createApiKey({ name: keyName.trim() });
      setApiKeys((current) => [created, ...current]);
      setNewKeySecret(created.secret);
      setShowKeyModal(true);
      setKeyName('');
      setToast('API key created');
    } finally {
      setSaving(false);
    }
  };

  const revokeKey = async (key: ApiKey) => {
    if (!window.confirm(`Revoke ${key.name}?`)) return;
    await deleteApiKey(key.id);
    setApiKeys((current) => current.filter((entry) => entry.id !== key.id));
    setToast('API key revoked');
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(newKeySecret);
    setToast('Secret copied');
  };

  const copyPrefix = async (prefix: string) => {
    await navigator.clipboard.writeText(prefix);
    setToast('Key prefix copied');
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Settings / Profile</p>
          <h1 className="mt-1 text-3xl font-semibold text-[color:var(--text-primary)]">Account, keys, and organization controls</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">Update your profile, rotate keys, and tune workspace policies from one place.</p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-[#0a0f1a] p-2">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => navigate(`/settings/${entry.id}`)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${tab === entry.id ? 'bg-[color:var(--color-primary)] text-white' : 'text-[color:var(--text-muted)] hover:bg-white/5 hover:text-white'}`}
            >
              {entry.icon}
              {entry.label}
            </button>
          ))}
        </div>

        {loading && <Card className="border-white/10 bg-white/5 p-6 text-[color:var(--text-muted)]">Loading settings…</Card>}

        {!loading && profile && orgSettings && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <Card className="space-y-5 border-white/10 bg-white/5 p-5 text-white">
              {tab === 'profile' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Profile</p>
                    <h2 className="mt-1 text-xl font-semibold">Update your account</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Name</span>
                      <input className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Title</span>
                      <input className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={profile.title ?? ''} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Phone</span>
                      <input className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={profile.phone ?? ''} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Timezone</span>
                      <input className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={profile.timezone ?? ''} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} />
                    </label>
                  </div>
                  <button className="rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90" type="button" onClick={() => void saveProfile()} disabled={saving}>
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Security</p>
                    <h2 className="mt-1 text-xl font-semibold">Access and sign-in</h2>
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold">Two-factor authentication</div>
                      <div className="text-[color:var(--text-muted)]">{profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                    <input type="checkbox" checked={profile.twoFactorEnabled} onChange={(event) => setProfile({ ...profile, twoFactorEnabled: event.target.checked })} />
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Current password</span>
                      <input type="password" className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={passwordFields.currentPassword} onChange={(event) => setPasswordFields({ ...passwordFields, currentPassword: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">New password</span>
                      <input type="password" className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={passwordFields.newPassword} onChange={(event) => setPasswordFields({ ...passwordFields, newPassword: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-[color:var(--text-muted)]">Confirm</span>
                      <input type="password" className="w-full rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" value={passwordFields.confirmPassword} onChange={(event) => setPasswordFields({ ...passwordFields, confirmPassword: event.target.value })} />
                    </label>
                  </div>
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={() => setToast('Password flow staged for the backend contract')}>
                    Open password change flow
                  </button>
                </div>
              )}

              {tab === 'keys' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">API Keys</p>
                    <h2 className="mt-1 text-xl font-semibold">Create and revoke keys</h2>
                  </div>
                  <div className="flex gap-3">
                    <input className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 outline-none" placeholder="Key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} />
                    <button className="rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => void createKey()} disabled={saving}>
                      Create key
                    </button>
                  </div>

                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-semibold">{key.name}</div>
                            <div className="text-sm text-[color:var(--text-muted)]">{key.prefix} · created {new Date(key.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex gap-2">
                            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => void copyPrefix(key.prefix)}>
                              <Copy size={14} className="inline-block" /> Copy
                            </button>
                            <button className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100" type="button" onClick={() => void revokeKey(key)}>
                              Revoke
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'billing' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Billing</p>
                    <h2 className="mt-1 text-xl font-semibold">Workspace plan snapshot</h2>
                  </div>
                  <Card className="border-white/10 bg-[#0a0f1a] p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Enterprise plan</div>
                        <div className="text-sm text-[color:var(--text-muted)]">Usage-based seats, retention, and export limits</div>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">Active</div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-[color:var(--text-muted)]">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">25 seats</div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">90 day retention</div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">CSV / ZIP exports</div>
                    </div>
                  </Card>
                </div>
              )}

              {tab === 'integrations' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Integrations</p>
                    <h2 className="mt-1 text-xl font-semibold">Audit and forwarding controls</h2>
                  </div>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold">Audit forwarding</div>
                      <div className="text-[color:var(--text-muted)]">Send structured events to external sinks</div>
                    </div>
                    <input type="checkbox" checked={orgSettings.auditForwarding} onChange={(event) => setOrgSettings({ ...orgSettings, auditForwarding: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold">Guest access</div>
                      <div className="text-[color:var(--text-muted)]">Allow external collaborators to join replay and reports</div>
                    </div>
                    <input type="checkbox" checked={orgSettings.allowGuestAccess} onChange={(event) => setOrgSettings({ ...orgSettings, allowGuestAccess: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold">Slack webhook</div>
                      <div className="text-[color:var(--text-muted)]">Publish queue and audit events to Slack</div>
                    </div>
                    <input type="checkbox" checked={orgSettings.slackWebhookEnabled} onChange={(event) => setOrgSettings({ ...orgSettings, slackWebhookEnabled: event.target.checked })} />
                  </label>
                  <button className="rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => void saveOrgSettings()} disabled={saving}>
                    Save organization settings
                  </button>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="border-white/10 bg-white/5 p-5 text-white">
                <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Account summary</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">Email</span><span>{profile.email}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">Timezone</span><span>{profile.timezone ?? '—'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">2FA</span><span>{profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></div>
                </div>
              </Card>
              <Card className="border-white/10 bg-white/5 p-5 text-white">
                <div className="text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Organization</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">Retention</span><span>{orgSettings.retentionDays} days</span></div>
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">Audit forwarding</span><span>{orgSettings.auditForwarding ? 'On' : 'Off'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[color:var(--text-muted)]">Guest access</span><span>{orgSettings.allowGuestAccess ? 'Allowed' : 'Restricted'}</span></div>
                </div>
              </Card>
            </div>
          </div>
        )}

        <Modal open={showKeyModal} onClose={() => setShowKeyModal(false)} title="New API key">
          <div className="space-y-4 text-white">
            <p className="text-sm text-[color:var(--text-muted)]">Copy this secret now. It will not be shown again.</p>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-4 font-mono text-sm break-all">{newKeySecret}</div>
            <div className="flex justify-end gap-3">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" type="button" onClick={() => setShowKeyModal(false)}>
                Close
              </button>
              <button className="rounded-2xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void copySecret()}>
                Copy secret
              </button>
            </div>
          </div>
        </Modal>

        {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#0a0f1a] px-4 py-2 text-sm text-white shadow-xl">{toast}</div>}
      </div>
    </AnimatedPage>
  );
}
