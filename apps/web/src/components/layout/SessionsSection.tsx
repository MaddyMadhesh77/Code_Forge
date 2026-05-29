import { NavLink, Outlet } from 'react-router-dom';
import styles from './RouteSectionNav.module.css';

export function SessionsSection() {
  return (
    <div className={styles.shell}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Sessions</p>
          <h2 className={styles.title}>Interview workspace</h2>
          <p className={styles.subtitle}>Open the live session list, then drill into a session for replay details.</p>
        </div>
        <span className={styles.contextPill}>Browse</span>
      </div>

      <nav className={styles.navRow} aria-label="Sessions navigation">
        <NavLink end to="/sessions" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
          All sessions
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

export default SessionsSection;