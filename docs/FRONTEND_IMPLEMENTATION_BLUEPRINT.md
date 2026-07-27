# Frontend Implementation Blueprint

This document is the implementation handoff for the Code Forge frontend. It is meant for frontend engineers who will build the UI, wire data fetching, and connect the app to the existing backend contracts.

## 1. Product Scope

The frontend should cover three layers of experience:

1. Public auth and marketing entry points.
2. Authenticated product workflows for problems, interviews, execution, reporting, queue management, users, and settings.
3. Enterprise/admin surfaces for analytics, queue monitoring, and system controls.

The current web app already exposes routes in `apps/web/src/App.tsx`, and the UI should be organized around those screens first. The backend already exposes controller surfaces in `apps/api/src/modules/*`, including auth, problems, execution, sessions, users, interviews, metrics, and queue.

## 2. Technology Stack

Use the following stack for the implementation:

- React + TypeScript.
- Next.js recommended for routing, server-side middleware, and auth redirects.
- Tailwind CSS with design tokens via CSS variables.
- TanStack Query for server state, caching, pagination, retries, and invalidation.
- Axios for the HTTP client with auth and refresh-token interceptors.
- React Hook Form for forms and inline validation.
- Zustand only for small client state such as theme, sidebar collapse, and UI preferences.
- Radix UI or Headless UI primitives for accessible menus, dialogs, tabs, and comboboxes.
- socket.io-client or the backend-specified realtime transport for live interview collaboration.

## 3. Design System

### 3.1 Theme tokens

Define tokens once in `src/styles/tokens.ts` or directly in Tailwind config using CSS variables.

- Primary: `#0B5FFF`
- Secondary: `#07C6A7`
- Background light: `#F6F8FB`
- Background dark: `#0B1220`
- Surface light: `#FFFFFF`
- Surface dark: `#0F1724`
- Accent: `#FFB020`
- Danger: `#EF4444`
- Success: `#10B981`
- Muted light: `#6B7280`
- Muted dark: `#B7C0CC`

Theme behavior:

- Default to system preference.
- Provide a header toggle that updates a CSS variable-based theme class on the root element.
- Persist preference in localStorage.
- Respect reduced motion preferences.

### 3.2 Typography

- Font family: Inter, with fallback to system-ui, -apple-system, Segoe UI, Roboto.
- H1: 36px / 700.
- H2: 28px / 600.
- H3: 20px / 600.
- Body: 16px / 400.
- Caption: 12px / 400.

### 3.3 Spacing and layout

- Use an 8px baseline for spacing decisions.
- Use a 12-column desktop grid.
- Collapse to one column on mobile.
- Keep layouts breathable; avoid dense stacking unless the task is a table or console.

### 3.4 Surface and control styles

- Cards: 8px radius, soft shadow in light mode, elevated contrast variant in dark mode, subtle border, no heavy glass effects.
- Buttons: primary solid, secondary outlined, ghost transparent, danger solid red.
- Inputs: 1px subtle border, 8px radius, primary focus ring.
- Tables: compact rows, hover highlight, sortable headers, no zebra striping.
- Toasts: top-of-page placement, transient success/error feedback.
- Skeletons: required for lists, tables, cards, and code panes during loading.

## 4. Component Model

Use a layered component model so page teams can move quickly without duplicating patterns.

### 4.1 Atoms

- Button.
- Input.
- Select.
- Textarea.
- Checkbox.
- Radio.
- Toggle.
- Badge.
- Avatar.
- IconButton.
- Spinner.

Behavior notes:

- Keep atoms visually consistent and fully controlled.
- Every atom must expose accessible labels or assistive text when needed.
- Error state styling must be consistent across all form controls.

### 4.2 Molecules

- SearchBar.
- Pagination.
- TagPill.
- MetricCard.
- StatusBadge.
- FilterRow.
- EmptyState.
- ConfirmDialog.
- ToastStack.
- FormField wrapper.

Behavior notes:

- Molecules should combine atoms without owning business logic.
- SearchBar should debounce only when the page explicitly asks for it.
- EmptyState should always support a primary CTA.

### 4.3 Organisms

- Navbar.
- Sidebar.
- PageContainer.
- Card.
- Table.
- Modal.
- Tabs.
- Chart wrapper.
- CodeEditor.
- RunConsole.
- LiveSession.
- ReplayTimeline.
- VideoGrid.
- ChatPanel.
- ParticipantList.

Behavior notes:

- Organisms are allowed to fetch data through hooks, but should not call APIs directly.
- PageContainer should standardize title, subtitle, breadcrumb, and action placement.
- Table should support server-side paging and sorting.
- CodeEditor should be a thin wrapper around Monaco or CodeMirror.
- LiveSession should encapsulate realtime connection state, presence, and collaborative updates.

### 4.4 Feature components

Keep feature folders self-contained:

- `features/problems`
- `features/interviews`
- `features/users`
- `features/settings`
- `features/reports`
- `features/queue`

Each feature folder should include:

- `api.ts` for feature-level request wrappers.
- `hooks.ts` for TanStack Query hooks.
- `components/` for feature-specific UI.
- `types.ts` for DTO alignment.
- `docs.md` or a README with behavior notes for implementers.

## 5. Frontend Architecture

Recommended folder structure:

```text
src/
  app/ or pages/
  components/
    atoms/
    molecules/
    organisms/
    layout/
    shared/
  features/
    problems/
    interviews/
    users/
    settings/
    reports/
    queue/
  services/
    api/
    hooks/
  contexts/
    AuthContext.tsx
    ThemeContext.tsx
    SocketContext.tsx
  lib/
  styles/
  types/
```

Implementation rules:

- Keep all API access in `services/api` and feature hooks.
- Do not fetch in random page components unless a page is a pure shell.
- Keep UI state local when possible.
- Use React Query for all server state.
- Use a single Axios instance with refresh-token handling.

## 6. API Plumbing

### 6.1 Axios client

Create one client, for example `src/services/http.ts`:

- Base URL: `/api` in local development, or a runtime env value.
- Attach `Authorization: Bearer <accessToken>` automatically.
- Refresh access tokens on 401 when a refresh token exists.
- Normalize backend errors into a shared `ApiError` shape.
- Unwrap both `{ data: ... }` and direct response payloads.

### 6.2 TanStack Query conventions

Use one hook family per resource:

- `useDashboardOverview()`
- `useProblems(params)`
- `useProblem(id)`
- `useCreateProblem()`
- `useUpdateProblem()`
- `useDeleteProblem()`
- `useSessions(params)`
- `useSession(id)`
- `useStartInterview()`
- `useUsers(params)`
- `useUpdateUser()`
- `useQueueJobs(params)`
- `useExecutionResult(submissionId)`
- `useReports()` or `useReport(sessionId)`

Hook rules:

- Queries own server state and caching.
- Mutations always invalidate the narrowest relevant cache set.
- Pagination should be server-side for large collections.
- Polling is allowed only for queue, execution, or live session readiness states.

### 6.3 Forms

Use React Hook Form with a shared resolver layer.

- Surface backend field errors inline on the matching input.
- Use toasts only for top-level success or unexpected failure.
- Prevent duplicate submissions with disabled states and pending indicators.

## 7. Navigation and Route Map

The authenticated app should use a sidebar plus top navbar shell.

### Public routes

- `/landing` or `/` for marketing entry.
- `/login`
- `/register`
- `/forgot-password` if enabled.

### Authenticated routes

- `/dashboard`
- `/problems`
- `/problems/new`
- `/problems/:id`
- `/sessions`
- `/sessions/:id`
- `/sessions/:id/replay`
- `/users`
- `/reports`
- `/analytics` if you keep it separate from reports.
- `/queue`
- `/settings`
- `/settings/profile`
- `/settings/security`
- `/settings/keys`
- `/admin` for enterprise control surfaces.

### Navigation behavior

- Sidebar highlights the active route and supports collapse on desktop.
- Navbar shows brand, global search, notifications, shortcuts, and user menu.
- Search should route to resource-specific search behavior instead of a generic full-text endpoint unless backend search exists.
- Authenticated routes must redirect to `/login` when the access token is missing or invalid.

## 8. Page-by-Page Blueprint

The mapping below uses the currently implemented backend controller surface in `apps/api/src/modules/*`. If the exact HTTP verb or path differs in the controller decorators, keep the request contract but align the final URL to the real route.

### 8.1 Login

Purpose: sign in and land on the dashboard.

UI layout:

- Centered auth card.
- Brand, heading, email/password form, primary CTA, forgot-password link, optional SSO buttons, signup link.

API mapping:

- Auth login: `POST /api/auth/login`.
  - Inputs: `{ email, password }`.
  - Outputs: `accessToken`, `refreshToken`, and user summary.
  - Trigger: form submit.
- Auth register: `POST /api/auth/register`.
  - Inputs: registration payload.
  - Trigger: signup form submit.
- Token refresh: `POST /api/auth/refresh`.
  - Inputs: refresh token.
  - Trigger: Axios 401 interceptor.
- Logout/revoke: `POST /api/auth/revoke`.
  - Trigger: sign-out action.
- Me/session probe: `GET /api/auth/me`.
  - Trigger: app bootstrap and guarded route entry.

Interactions:

- Submit shows pending state on the button.
- Field errors render inline.
- Successful login persists tokens and redirects to `/dashboard`.

### 8.2 Dashboard

Purpose: summarize activity and provide shortcuts.

UI layout:

- Metric cards at top.
- Recent sessions and recent problems in a two-column grid.
- Activity feed or notifications lower on the page.
- Optional right rail for quick actions.

API mapping:

- Dashboard metrics: `GET /api/dashboard/metrics`.
  - Trigger: page load.
  - Output: summary metrics and trend data.
- Interviews list shortcut: `GET /api/interviews?limit=5&offset=0`.
  - Trigger: page load or refresh.
- Problems list shortcut: `GET /api/problems`.
  - Trigger: page load or refresh.
- Health check: `GET /health`.
  - Trigger: optional shell-level status indicator.

Interactions:

- Clicking a session row routes to `/sessions/:id`.
- Clicking a problem row routes to `/problems/:id`.

### 8.3 Problems List

Purpose: browse, search, filter, create, and manage problems.

UI layout:

- Page header with title and actions.
- Search and filters row.
- Problems table with paging.
- Bulk actions bar when rows are selected.

API mapping:

- Published problems list: `GET /api/problems`.
  - Inputs: `q`, `tags[]`, `difficulty`, `page`, `pageSize`, `sort`.
  - Trigger: initial load, search debounce, filter change, pagination change.
- Custom problems list: `GET /api/problems/custom` or the backend’s actual custom-problem route.
  - Trigger: enterprise or team-scoped views.
- Create problem: `POST /api/problems`.
  - Inputs: problem payload.
  - Trigger: create modal submit.
- Fetch problem detail for edit: `GET /api/problems/:id`.
  - Trigger: edit modal open.
- Bulk delete: `POST /api/problems/bulk-delete` if the backend exposes it, otherwise use the actual delete endpoint contract.
  - Trigger: confirm bulk action.
- Add private test case: `POST /api/problems/:id/test-cases` or the real controller path.
  - Trigger: test-case editor submit.

Interactions:

- Debounce search input before refetching.
- Keep selected rows in local state only.
- Use a modal for create/edit if the form is simple; use a page if the form grows beyond one screen.

### 8.4 Problem Detail

Purpose: view the statement, authoring metadata, test cases, and run code.

UI layout:

- Two-column layout.
- Left: statement, constraints, samples, notes.
- Right: code editor, language selector, run console, testcase list.
- Sticky action bar for run, start interview, fork, and bookmark.

API mapping:

- Public problem detail: `GET /api/problems/:slug` or `GET /api/problems/:id` depending on the backend contract.
  - Trigger: page load.
- Custom problem detail: `GET /api/problems/custom/:id` if the screen is for authored problems.
  - Trigger: page load for private/team problems.
- Submit code to execution: `POST /api/execution` or the actual execution submission route in the controller.
  - Inputs: `{ problemId, language, code, stdin? }`.
  - Trigger: Run button.
- Fetch execution result: `GET /api/execution/:submissionId` or the actual result route.
  - Trigger: optimistic poll after submission.
- Start interview session: `POST /api/interviews`.
  - Inputs: `{ problemId, title?, scheduledAt?, role?, level? }`.
  - Trigger: Start Interview CTA.

Interactions:

- Run keeps history in the local UI so users can compare attempts.
- Result pane shows stdout, stderr, runtime, and status.

### 8.5 Interview Sessions List

Purpose: list live, scheduled, and completed sessions.

UI layout:

- Header with create session action.
- Filters for status, date, and role.
- Sessions table or cards depending on density.

API mapping:

- List interviews: `GET /api/interviews?limit=&offset=`.
  - Trigger: page load and paging.
- Create interview: `POST /api/interviews`.
  - Trigger: create session modal.
- Join interview: `POST /api/interviews/join`.
  - Trigger: join link flow or token entry.
- Update status: `PUT /api/interviews/:id/status`.
  - Trigger: admin or host status action.
- End interview: `POST /api/interviews/:id/end`.
  - Trigger: end-session action.

### 8.6 Interview Session Live

Purpose: collaborative live interview, coding, chat, and host controls.

UI layout:

- Compact header with timer, participants, connection state, and end-session controls.
- Left or collapsible panel for problem context.
- Center code editor with shared cursor presence.
- Right rail for video, chat, participants, and activity log.
- Bottom pane for execution output and test cases.

API mapping:

- Get interview details: `GET /api/interviews/:id`.
  - Trigger: initial page load.
- Join session: `POST /api/interviews/:id/join` if the backend exposes session-scoped join, or `POST /api/interviews/join` for token-based join.
  - Trigger: on mount after auth and room validation.
- Create session links: `POST /api/interviews/:id/links`.
  - Trigger: share-link UI.
- List session links: `GET /api/interviews/:id/links`.
  - Trigger: link management panel open.
- Revoke link: `DELETE /api/interviews/links/:linkId`.
  - Trigger: confirm revoke action.
- Run code: `POST /api/execution` or the actual execution submit route.
  - Trigger: Run button.
- Save scorecard: `POST /api/interviews/:id/scorecard`.
  - Trigger: end-of-session or reviewer submit.
- Get scorecard report: `GET /api/interviews/:id/scorecard-report`.
  - Trigger: review screen load.
- Debug session: `POST /api/interviews/:id/debug/start` and related debug actions if enabled.
  - Trigger: enterprise debugging tools.

Realtime mapping:

- Use the backend collaboration namespace or socket path for code-change, cursor, presence, and chat.
- Keep local optimistic rendering and reconcile from server events.
- Show disconnected/reconnecting state clearly.

### 8.7 Session Replay

Purpose: review a completed interview with timeline, code playback, and notes.

UI layout:

- Left: playback timeline and event list.
- Center: code playback and scrubber.
- Right: chat, annotations, and notes.
- Header: session metadata and download action.

API mapping:

- Recording: `GET /api/interviews/:id/recording`.
  - Trigger: page load.
- Recording artifacts: `GET /api/interviews/:id/recording/artifacts` if exposed.
  - Trigger: playback details panel.
- Export report: `POST /api/interviews/:id/export`.
  - Trigger: download action.
- Public report: `GET /api/interviews/public/report/:token`.
  - Trigger: shared report landing page.

### 8.8 Users / Team

Purpose: manage members, roles, and account status.

UI layout:

- Header with invite action.
- Filters row for role and status.
- Users table with avatars and actions.

API mapping:

- List users: `GET /api/users`.
  - Trigger: page load and filters.
- User detail: `GET /api/users/:id`.
  - Trigger: details drawer or edit modal.
- Update user: `PUT /api/users/:id`.
  - Trigger: role/status save.
- Deactivate user: `POST /api/users/:id/deactivate` or the actual controller path.
  - Trigger: confirm modal.
- Activate user: `POST /api/users/:id/activate` or the actual controller path.
  - Trigger: confirm modal.
- Invite user: if the backend exposes an invite endpoint, wire it here; otherwise keep the form ready for the real contract.

### 8.9 Reports / Analytics

Purpose: show product, interview, and execution trends.

UI layout:

- Time-range selector and export action at top.
- Metric cards and charts in a responsive grid.
- Top problems and failure tables beneath.

API mapping:

- Interview dashboard analytics: `GET /api/interviews/dashboard?days=14` or the real analytics route.
  - Trigger: page load and range change.
- Metrics endpoint: `GET /metrics` for operational Prometheus scraping, not user-facing analytics.
  - Trigger: monitoring only.
- Top problem data: `GET /api/problems/top` if exposed, otherwise derive from analytics route.

Interactions:

- Refetch on range change.
- Keep charts lightweight and tooltipped.

### 8.10 Queue / Jobs

Purpose: monitor background jobs and retry failures.

UI layout:

- Filter controls with optional polling toggle.
- Jobs table with expandable logs.
- Retry and cancel actions in row menus.

API mapping:

- Queue status: `GET /api/queue/status` if exposed by the backend shell.
  - Trigger: page load.
- List jobs: `GET /api/queue/jobs` or the actual queue route.
  - Trigger: page load, filter changes, polling.
- Retry job: `POST /api/queue/jobs/:id/retry`.
  - Trigger: row action.
- Cancel job: `POST /api/queue/jobs/:id/cancel`.
  - Trigger: row action.
- Job logs: `GET /api/queue/jobs/:id/logs`.
  - Trigger: row expansion.

### 8.11 Settings / Profile

Purpose: update profile, password, API keys, and workspace settings.

UI layout:

- Tabs for profile, security, API keys, integrations, and billing if enabled.
- Each tab has one primary save action.

API mapping:

- Current user: `GET /api/auth/me` or `GET /api/users/me` depending on the backend contract.
  - Trigger: page load.
- Update profile: `PUT /api/users/me`.
  - Trigger: save button.
- API keys: `POST /api/users/me/keys` and `DELETE /api/users/me/keys/:keyId`.
  - Trigger: create/revoke actions.
- Org settings: `GET /api/orgs/:id/settings` and `PUT /api/orgs/:id/settings` if the backend exposes organization-level config.

### 8.12 Admin / System

Purpose: enterprise controls for migrations, audit logs, retention, and health.

UI layout:

- System cards for health and usage.
- Tables for audit and job records.
- Forms for retention and integration settings.

API mapping:

- Use the admin controller surface in `apps/api/src/modules/admin` if present.
- Use metrics, queue, and report routes as supporting data sources.

## 9. Data Mapping Standards

Frontend DTOs should mirror backend response shapes as closely as possible.

Recommended shared types:

- `UserSummary`
- `AuthSession`
- `ProblemSummary`
- `ProblemDetail`
- `InterviewSummary`
- `InterviewDetail`
- `ExecutionResult`
- `Scorecard`
- `ReportSummary`
- `QueueJob`
- `AnalyticsSnapshot`

Rules:

- Keep DTOs in `src/types` or a generated package.
- Normalize date strings to one local display helper.
- Keep enums exact and uppercase when the backend uses uppercase values.
- Avoid leaking backend database fields directly into UI components.

## 10. Interaction and UX Rules

- Visible primary action per screen.
- Loading state on every async area.
- Skeletons for initial fetches, spinners for short actions.
- Inline validation for forms.
- Toasts for success and unexpected failure.
- Empty states should explain what the user can do next.
- Use optimistic updates only for low-risk local transitions.
- Preserve unsaved editor content in local state if the route changes unexpectedly.

## 11. Accessibility Rules

- Keyboard support for all menus, dialogs, tabs, lists, and editors.
- Every form control requires a label or ARIA label.
- Live session components need status text for connection and presence.
- Color contrast must remain above 4.5:1.
- Focus rings must remain visible in both themes.
- Use semantic headings in page containers.

## 12. Realtime and Collaboration Notes

- Encapsulate sockets in a `SocketProvider`.
- Expose `useSocketEvent` and `useSocketEmit` hooks.
- Reconnect automatically with backoff.
- Sync editor text, cursor, participant presence, and chat through one source of truth.
- Use local optimistic updates, but reconcile against authoritative server state on reconnect.

## 13. Developer Handoff Checklist

1. Set up Next.js, TypeScript, Tailwind, TanStack Query, React Hook Form, Axios, and Zustand.
2. Create the token system and theme switcher.
3. Build the shell: Navbar, Sidebar, PageContainer, layout grid.
4. Add the Axios instance with auth and refresh interceptors.
5. Add TanStack Query hooks for problems, sessions, interviews, users, queue, execution, and reports.
6. Implement skeletons, empty states, loading, and error states.
7. Wire each page to the matching backend route.
8. Add E2E smoke tests for login, dashboard navigation, problem detail, start interview, and execution run.

## 14. Notes for Implementers

- Treat the current route list in `apps/web/src/App.tsx` as the minimum baseline.
- Keep page-level data orchestration thin; move reusable behavior into hooks and feature modules.
- When the backend contract differs from this document, keep the UI pattern and update only the hook URL and DTO mapping.
- Prefer building one feature slice at a time: shell first, then problems, then sessions/interviews, then users/settings, then reports and queue.
