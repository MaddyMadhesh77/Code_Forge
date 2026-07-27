import { NavLink, Outlet, Link, useParams } from 'react-router-dom';
import styles from './RouteSectionNav.module.css';

export function SessionDetailSection() {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <div className={styles.shell}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>
            <Link to="/sessions" className={styles.breadcrumbLink}>Sessions</Link>
            <span className={styles.slash}>/</span>
            Session {id}
          </p>
          <h2 className={styles.title}>Session detail</h2>
          <p className={styles.subtitle}>Switch between the live room and replay from this nested route group.</p>
        </div>
        <span className={styles.contextPill}>Session {id}</span>
      </div>

      <nav className={styles.navRow} aria-label="Session detail navigation">
        <NavLink end to={`/sessions/${id}`} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
          Live
        </NavLink>
        <NavLink to={`/sessions/${id}/replay`} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
          Replay
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

export default SessionDetailSection;