/**
 * CodeForge – Typography Tokens
 *
 * Three font stacks plus a complete type scale.
 * Values here mirror the CSS custom properties in `theme.css`.
 */

export const fontFamily = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export interface TypeStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

export const typeScale = {
  /** Page titles */
  h1: {
    fontSize: '2rem',       /* 32 px */
    lineHeight: '2.5rem',   /* 40 px */
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  /** Section headings */
  h2: {
    fontSize: '1.5rem',     /* 24 px */
    lineHeight: '2rem',     /* 32 px */
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  /** Card / panel titles */
  h3: {
    fontSize: '1.25rem',    /* 20 px */
    lineHeight: '1.75rem',  /* 28 px */
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  /** Sub-headings */
  h4: {
    fontSize: '1rem',       /* 16 px */
    lineHeight: '1.5rem',   /* 24 px */
    fontWeight: 600,
  },
  /** Default body text */
  body: {
    fontSize: '1rem',       /* 16 px */
    lineHeight: '1.5rem',   /* 24 px */
    fontWeight: 400,
  },
  /** Secondary body */
  bodySmall: {
    fontSize: '0.875rem',   /* 14 px */
    lineHeight: '1.25rem',  /* 20 px */
    fontWeight: 400,
  },
  /** Captions & metadata */
  caption: {
    fontSize: '0.75rem',    /* 12 px */
    lineHeight: '1rem',     /* 16 px */
    fontWeight: 400,
  },
  /** Overline / labels */
  overline: {
    fontSize: '0.75rem',    /* 12 px */
    lineHeight: '1rem',     /* 16 px */
    fontWeight: 500,
    letterSpacing: '0.05em',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeScaleKey = keyof typeof typeScale;
