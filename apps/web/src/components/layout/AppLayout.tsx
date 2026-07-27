import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, MoonStar, Plus, Search, Settings2, SunMedium, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/ThemeProvider';
import { Sidebar } from './Sidebar';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orgId, setOrgId] = useState('org-1');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const initials = useMemo(() => {
    const source = user?.displayName?.trim();
    if (!source) return 'CF';
    return source
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.displayName]);

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    if (query.toLowerCase().includes('session')) {
      navigate(`/sessions?q=${encodeURIComponent(query)}`);
      return;
    }
    navigate(`/problems?q=${encodeURIComponent(query)}`);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandCluster}>
          <button className={styles.brand} type="button" onClick={() => navigate('/dashboard')}>
            <span className={styles.brandMark}>CF</span>
            <span className={styles.brandText}>Code Forge</span>
          </button>

          <label className={styles.orgSelectWrap} aria-label="Organization selector">
            <Settings2 size={14} />
            <select className={styles.orgSelect} value={orgId} onChange={(event) => setOrgId(event.target.value)}>
              <option value="org-1">Acme Engineering</option>
              <option value="org-2">Forge Labs</option>
            </select>
          </label>
        </div>

        <form
          className={styles.searchWrap}
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <label className={styles.search} aria-label="Search problems or sessions">
            <Search size={16} />
            <input
              placeholder="Search problems or sessions"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </form>

        <div className={styles.topbarActions}>
          <div className={styles.quickActions}>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate('/problems/new')}>
              <Plus size={14} /> New Problem
            </button>
            <button className={styles.quickActionButton} type="button" onClick={() => navigate('/sessions')}>
              <Plus size={14} /> New Session
            </button>
          </div>

          <button className={styles.iconButton} type="button" aria-label="Notifications">
            <Bell size={16} />
            <span className={styles.notificationDot} />
          </button>

          <button className={styles.iconButton} type="button" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
          </button>

          <div className={styles.avatarMenuWrap}>
            <button
              className={styles.userPill}
              type="button"
              title={user?.displayName ?? 'Guest'}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.userName}>{user?.displayName ?? 'Guest'}</span>
              <ChevronDown size={14} />
            </button>

            {menuOpen && (
              <div className={styles.avatarMenu}>
                <button className={styles.avatarMenuItem} type="button" onClick={() => { setMenuOpen(false); navigate('/settings/profile'); }}>
                  <UserCircle2 size={14} /> Profile
                </button>
                <button className={styles.avatarMenuItem} type="button" onClick={() => { setMenuOpen(false); navigate('/settings/profile'); }}>
                  <Settings2 size={14} /> Settings
                </button>
                <button className={styles.avatarMenuItem} type="button" onClick={handleSignOut}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className={`${styles.main} ${collapsed ? styles.sidebarCollapsed : ''}`}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
