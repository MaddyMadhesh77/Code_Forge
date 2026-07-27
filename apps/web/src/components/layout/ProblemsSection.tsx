import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './RouteSectionNav.module.css';

export function ProblemsSection() {
  const location = useLocation();
  const isDetailRoute = location.pathname.startsWith('/problems/') && location.pathname !== '/problems/new';

  return (
    <div className={styles.shell}>
      <div className={styles.headerRow}>
        <nav className={styles.navRow} aria-label="Problems navigation">
          <NavLink end to="/problems" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
            Browse
          </NavLink>
          <NavLink to="/problems/new" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
            Create
          </NavLink>
        </nav>
        {isDetailRoute && <span className={styles.contextPill}>Detail view</span>}
      </div>

      <Outlet />
    </div>
  );
}

export default ProblemsSection;