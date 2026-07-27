# Code Forge Web

React + TypeScript frontend for the Code Forge workspace.

## Run

```bash
pnpm --filter web install
pnpm --filter web dev
```

Development runs on `http://localhost:3000` via Vite.

## Build and Test

```bash
pnpm --filter web build
pnpm --filter web test
pnpm --filter web typecheck
```

## Environment

The web app reads these variables when available:

- `NEXT_PUBLIC_API_BASE_URL` for API requests, defaulting to `/api`
- `NEXT_PUBLIC_WS_URL` for realtime/socket connections
- `NEXT_PUBLIC_USE_MOCKS=true` to force local fallbacks when an endpoint is unavailable

Theme tokens live in `src/styles/theme.css` and are mirrored in `src/tokens` for TypeScript usage. The app uses a `class` dark-mode strategy and a `data-theme` attribute on the root element.

## Scaffold Notes

- `src/providers/ThemeProvider.tsx` toggles `class="dark"` and `data-theme`.
- `src/providers/SocketProvider.tsx` is a placeholder around `socket.io-client` for interview realtime wiring.
- `src/hooks/useProblems.ts` and `src/hooks/useDashboardOverview.ts` use React Query.
- The shared API client lives in `src/services/api.ts` and falls back to mock data in dev when an endpoint is missing.

## Theming

Every page should style itself from the CSS variables in `src/styles/theme.css` (via `bg-[color:var(--bg-surface)]`-style Tailwind arbitrary values, or the `Card`/`Badge` components), never hardcoded Tailwind colors like `bg-white/5` or `text-white`. `Reports`, `Users`, `Queue`, and `Settings` were previously built with a fixed dark-glass look that ignored the light/dark toggle; they've been converted to the token-based system so the whole app now switches themes consistently. The `/problems` and `/sessions` route wrappers also no longer duplicate the page-level heading — the wrapper only owns tab navigation now.
