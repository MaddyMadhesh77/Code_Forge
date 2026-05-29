# CodeForge Design System – Styles & Tokens

## Architecture

```
src/styles/
├── theme.css              ← CSS custom properties (single source of truth)
├── tailwind.css           ← Tailwind directives (@tailwind base/components/utilities)
├── index.css              ← (legacy) global overrides – being consolidated
├── README.md              ← you are here
└── tokens/
    ├── colors.ts          ← typed color hex values for JS usage
    ├── typography.ts      ← font families + type scale
    └── spacing.ts         ← 8 px grid spacing system
```

## How It Works

### CSS Variables → Tailwind → Components

1. **`theme.css`** defines every visual token as a CSS custom property on `:root`
   (light) and `.dark` / `[data-theme='dark']` (dark).

2. **`tailwind.config.js`** maps those variables into Tailwind's theme so you
   can use classes like `bg-bg-surface`, `text-accent`, `shadow-glow`.

3. **Components** use either Tailwind utilities or raw `var(--*)` — both
   resolve to the same underlying value.

### When to Use What

| Need                          | Use                                  |
|-------------------------------|--------------------------------------|
| Styling a React component     | Tailwind classes or CSS Modules      |
| Chart library / canvas colour | `import { colors } from 'tokens'`   |
| Programmatic spacing calc     | `import { SPACING_UNIT } from 'tokens'` |

## Dark Mode

Theme toggling is handled by **`ThemeProvider`** (`src/lib/ThemeProvider.tsx`):

```tsx
import { ThemeProvider } from './lib/ThemeProvider';

<ThemeProvider>
  <App />
</ThemeProvider>
```

Inside any component:

```tsx
import { useTheme } from '../lib/ThemeProvider';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>{theme === 'dark' ? '🌙' : '☀️'}</button>;
}
```

**How it toggles:**

- Adds/removes `.dark` on `<html>`
- Sets `data-theme="dark"` / `data-theme="light"` attribute
- Persists preference in `localStorage` (`codeforge_theme`)
- Falls back to `prefers-color-scheme` on first visit

## Spacing System (8 px Grid)

Every spacing value is a multiple of **8 px**:

| Token    | Value | Tailwind class |
|----------|-------|----------------|
| `0.5`    | 4 px  | `p-0.5`        |
| `1`      | 8 px  | `p-1`          |
| `1.5`    | 12 px | `p-1.5`        |
| `2`      | 16 px | `p-2`          |
| `3`      | 24 px | `p-3`          |
| `4`      | 32 px | `p-4`          |
| `5`      | 40 px | `p-5`          |
| `6`      | 48 px | `p-6`          |
| `8`      | 64 px | `p-8`          |
| `10`     | 80 px | `p-10`         |

## Adding New Tokens

1. Add the CSS variable to **`theme.css`** (both `:root` and `.dark`).
2. Add the Tailwind mapping in **`tailwind.config.js`**.
3. If JS access is needed, add the typed value in the appropriate
   `tokens/*.ts` file.

That's it — one variable, three access paths, zero drift.
