/**
 * CodeForge – Spacing Tokens (8 px grid)
 *
 * The base unit is 8 px.  Every key represents a multiplier:
 *   spacing[2] → 2 × 8 = 16 px
 *
 * These values are mirrored in:
 *   • CSS custom properties   (--space-*)  in theme.css
 *   • Tailwind spacing scale  in tailwind.config.js
 */

export const spacing = {
  /** 4 px – micro gaps, icon padding */
  0.5: '4px',
  /** 8 px – base unit */
  1:   '8px',
  /** 12 px */
  1.5: '12px',
  /** 16 px – standard gap */
  2:   '16px',
  /** 20 px */
  2.5: '20px',
  /** 24 px – card padding, section gaps */
  3:   '24px',
  /** 32 px */
  4:   '32px',
  /** 40 px */
  5:   '40px',
  /** 48 px */
  6:   '48px',
  /** 64 px */
  8:   '64px',
  /** 80 px */
  10:  '80px',
} as const;

/** Base unit in pixels — useful for programmatic spacing calculations. */
export const SPACING_UNIT = 8;

/** Layout-specific dimensions that align with the 8 px grid. */
export const layout = {
  sidebarWidth:     240,  /* 30 × 8 */
  sidebarCollapsed: 64,   /*  8 × 8 */
  headerHeight:     56,   /*  7 × 8 */
} as const;

export type SpacingKey = keyof typeof spacing;
