/**
 * CodeForge – Color Tokens (TypeScript)
 *
 * Raw hex values that mirror the CSS custom properties in `theme.css`.
 * Use these when you need colour values in JS (e.g. charting libraries,
 * canvas drawing, programmatic style objects).
 *
 * For CSS / Tailwind, prefer `var(--accent-primary)` or the Tailwind
 * utility classes (`bg-accent`, `text-status-success`, etc.).
 */

export const colors = {
  /* ── Backgrounds ── */
  bg: {
    primary:       '#F8FAFC',
    secondary:     '#F1F5F9',
    surface:       '#FFFFFF',
    surfaceHover:  '#F1F5F9',
    surfaceActive: '#E2E8F0',
  },

  /* ── Borders ── */
  border: {
    primary: '#E2E8F0',
    subtle:  '#F1F5F9',
    focus:   '#4F8FFF',
  },

  /* ── Accent palette ── */
  accent: {
    primary:      '#4F8FFF',
    primaryHover: '#3B7BEB',
    cyan:         '#00D4AA',
    amber:        '#FFB224',
    rose:         '#FF6B8A',
    purple:       '#818CF8',
  },

  /* ── Text ── */
  text: {
    primary:   '#0F172A',
    secondary: '#475569',
    muted:     '#94A3B8',
    inverse:   '#FFFFFF',
  },

  /* ── Status ── */
  status: {
    success: '#10B981',
    error:   '#EF4444',
    warning: '#F59E0B',
    pending: '#818CF8',
    info:    '#4F8FFF',
  },

  /* ── Difficulty ── */
  difficulty: {
    easy:   '#10B981',
    medium: '#FFB224',
    hard:   '#EF4444',
  },
} as const;

/** Dark mode overrides — only the values that change. */
export const darkColors = {
  bg: {
    primary:       '#0A0A0F',
    secondary:     '#12121A',
    surface:       '#1A1A2E',
    surfaceHover:  '#252540',
    surfaceActive: '#2E2E4A',
  },
  border: {
    primary: '#2A2A3E',
    subtle:  '#1E1E30',
  },
  text: {
    primary:   '#EAEAF0',
    secondary: '#8B8BA3',
    muted:     '#5B5B73',
    inverse:   '#0A0A0F',
  },
} as const;

export type ColorToken = typeof colors;
export type DarkColorOverrides = typeof darkColors;
