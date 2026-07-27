import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  Users,
  ChevronLeft,
  ChevronRight,
  Anvil,
  LogOut,
  FolderKanban,
  Settings2,
  Server,
  ClipboardList,
  SquarePen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/problems', icon: Code2, label: 'Problems' },
  { to: '/problems/new', icon: SquarePen, label: 'Create' },
  { to: '/sessions', icon: Users, label: 'Sessions' },
  { to: '/reports', icon: ClipboardList, label: 'Reports' },
  { to: '/queue', icon: Server, label: 'Queue' },
  { to: '/users', icon: FolderKanban, label: 'Users' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
];

const adminItems = [{ to: '/admin', icon: Settings2, label: 'Admin' }];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CF';

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <Anvil size={20} />
        </div>
        <span className={styles.logoText}>CodeForge</span>
      </div>

      <nav className={styles.nav}>
        <span className={styles.navGroup}>Main</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`${styles.navItem} ${isActive(item.to) ? styles.active : ''}`}
          >
            <item.icon className={styles.navIcon} />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <span className={styles.navGroup}>Admin</span>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`${styles.navItem} ${isActive(item.to) ? styles.active : ''}`}
              >
                <item.icon className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {user?.role === 'ADMIN' && (
          <>
            <span className={styles.navGroup}>Enterprise</span>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`${styles.navItem} ${isActive(item.to) ? styles.active : ''}`}
              >
                <item.icon className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.displayName ?? 'Guest'}</span>
            <span className={styles.userRole}>{user?.role ?? 'CANDIDATE'}</span>
          </div>
        </div>

        <div className={styles.footerActions}>
          <button
            className={styles.toggleBtn}
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
          <button
            className={styles.toggleBtn}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
