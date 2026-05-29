/**
 * CodeForge – Tailwind CSS Configuration
 *
 * Every visual value is pulled from CSS custom properties defined in
 * `src/styles/theme.css`.  This keeps Tailwind utilities and raw CSS
 * in perfect sync — change a token once, it updates everywhere.
 *
 * Dark mode uses the `class` strategy so ThemeProvider can toggle the
 * `.dark` class on <html>.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  darkMode: 'class',

  theme: {
    extend: {
      /* ── Colours (CSS variable backed) ── */
      colors: {
        bg: {
          primary:      'var(--bg-primary)',
          secondary:    'var(--bg-secondary)',
          surface:      'var(--bg-surface)',
          'surface-hover':  'var(--bg-surface-hover)',
          'surface-active': 'var(--bg-surface-active)',
          glass:        'var(--bg-glass)',
        },
        border: {
          DEFAULT:  'var(--border-primary)',
          subtle:   'var(--border-subtle)',
          focus:    'var(--border-focus)',
        },
        accent: {
          DEFAULT:  'var(--accent-primary)',
          hover:    'var(--accent-primary-hover)',
          glow:     'var(--accent-primary-glow)',
          cyan:     'var(--accent-cyan)',
          amber:    'var(--accent-amber)',
          rose:     'var(--accent-rose)',
          purple:   'var(--accent-purple)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverse:   'var(--text-inverse)',
        },
        status: {
          success: 'var(--status-success)',
          error:   'var(--status-error)',
          warning: 'var(--status-warning)',
          pending: 'var(--status-pending)',
          info:    'var(--status-info)',
        },
        difficulty: {
          easy:   'var(--difficulty-easy)',
          medium: 'var(--difficulty-medium)',
          hard:   'var(--difficulty-hard)',
        },
      },

      /* ── Typography ── */
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      /* ── 8 px spacing scale ── */
      spacing: {
        '0.5': '4px',    /* space-1 */
        '1':   '8px',    /* base unit */
        '1.5': '12px',
        '2':   '16px',
        '2.5': '20px',
        '3':   '24px',
        '4':   '32px',
        '5':   '40px',
        '6':   '48px',
        '8':   '64px',
        '10':  '80px',
      },

      /* ── Border radii ── */
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      /* ── Shadows ── */
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },

      /* ── Transitions ── */
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },
    },
  },

  plugins: [],
};
