import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

/* ── Public types ──────────────────────────────────────────────────────────── */

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current active theme. */
  theme: Theme;
  /** Toggle between light ↔ dark. */
  toggle: () => void;
  /** Set a specific theme directly. */
  setTheme: (t: Theme) => void;
}

/* ── Internals ─────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'codeforge_theme';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* SSR or storage blocked — ignore */
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage full / blocked — ignore */
  }
}

/* ── Context ───────────────────────────────────────────────────────────────── */

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

/* ── Provider ──────────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Sync the DOM whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */

/**
 * Access the current theme and controls from any component below
 * `<ThemeProvider>`.
 *
 * ```tsx
 * const { theme, toggle } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export default ThemeProvider;
