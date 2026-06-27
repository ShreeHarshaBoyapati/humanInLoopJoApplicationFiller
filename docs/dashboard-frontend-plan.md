# Dashboard frontend — tiny step plan

This plan turns the `Frontend implementation plan` section in `docs/dashboard-spec.md` into a long, ordered list of small steps. Each step is self-contained, names the file to create/edit, and explains the _why_ in one or two sentences. Follow the steps top-to-bottom; later steps assume earlier ones are done.

## Conventions used in every step

- Web app code lives in `apps/web/src`.
- Shared types live in `packages/shared-types` and are already exported from the barrel `packages/shared-types/src/index.ts`. **No new types are needed** — `DashboardResponse`, `OnboardingResponse`, `WeeklyGoalResponse`, etc. are already defined.
- Reuse the existing authenticated `axiosInstance` from `apps/web/src/utils/axios.ts`.
- Reuse the existing TanStack Router setup, the existing React Query client (`apps/web/src/utils/query-client.ts`), and the existing realtime sync (`apps/web/src/realtime/realtime-handler.ts`).
- Filenames are **kebab-case** (per `.clinerules`).
- **No inline CSS** — every component pairs with a `*.module.css` file in `apps/web/src/components/dashboard/style/`. All colors, fonts, and spacing come from `packages/ui/src/constants/css-constants.css` CSS variables.
- Add a short top-of-file comment to every new component describing its purpose and features (per `.clinerules`).
- Prefer the existing `Enhanced*` UI primitives from `@repo/ui` (e.g. `EnhancedButton`, `EnhancedChip`, `EnhancedFieldLabel`, `EnhancedTextField`, `EnhancedSelectDropdown`, `EnhancedStepper`, `Modal`, `Card`, `Snackbar`) over reinventing them.

---

## Phase 0 — Data layer (no UI yet)

These steps add the hooks the screens need. They are independent of the dashboard route, so the rest of the app keeps building while dashboard widgets are being built.

### Step 0.1 — Confirm the API module covers all three endpoints

**File:** `apps/web/src/services/dashboard-api.ts` (already exists)

- Verify the file already exports: `getOnboarding`, `getDashboard`, `getWeeklyGoal`, `updateWeeklyGoal`.
- Verify it reuses the shared types `OnboardingResponse`, `DashboardResponse`, `WeeklyGoalResponse`, `UpdateWeeklyGoalInput`, `DashboardRange` from `@repo/shared-types`.
- Verify all four functions go through `axiosInstance` and throw on `success === false`.
- **Why:** the spec lists this as a single bullet, but it's the foundation for every hook; verifying now prevents double work.

### Step 0.2 — Add the onboarding hook

**New file:** `apps/web/src/hooks/use-onboarding.ts`

- Export `ONBOARDING_KEYS = { all: ['dashboard', 'onboarding'] as const }` so the realtime handler can target it.
- Export `useOnboarding()` that calls `useQuery({ queryKey: ONBOARDING_KEYS.all, queryFn: getOnboarding })`.
- Export `useInvalidateOnboarding()` that returns a function calling `queryClient.invalidateQueries({ queryKey: ONBOARDING_KEYS.all })` — used after a "Skip for now" click and after returning from any step's CTA.
- **Why:** the onboarding view needs to know which steps are complete and refetch when the user comes back from settings / persona / job tracker.

### Step 0.3 — Add the dashboard hook

**New file:** `apps/web/src/hooks/use-dashboard.ts`

- Export `DASHBOARD_KEYS = { all: ['dashboard', 'summary'] as const, byRange: (range) => [...DASHBOARD_KEYS.all, range] }`.
- Export `useDashboard({ range: DashboardRange, topAtsLimit?, eventsLimit? })` that calls `useQuery({ queryKey: DASHBOARD_KEYS.byRange(range), queryFn: () => getDashboard({ range, topAtsLimit, eventsLimit }) })`.
- Export `useInvalidateDashboard()` returning a function that invalidates every query matching `DASHBOARD_KEYS.all` (so all ranges refetch together).
- **Why:** every State-2 widget reads from this; keeping a single source of truth means the realtime handler only needs to invalidate one prefix.

### Step 0.4 — Add the weekly-goal hooks

**New file:** `apps/web/src/hooks/use-weekly-goal.ts`

- Export `WEEKLY_GOAL_KEYS = { all: ['dashboard', 'weekly-goal'] as const }`.
- Export `useWeeklyGoal()` calling `useQuery({ queryKey: WEEKLY_GOAL_KEYS.all, queryFn: getWeeklyGoal })`.
- Export `useUpdateWeeklyGoal()` calling `useMutation`; on success, call `queryClient.invalidateQueries({ queryKey: WEEKLY_GOAL_KEYS.all })` and `queryClient.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false })` (the dashboard summary embeds the same numbers).
- **Why:** the weekly-goal card needs the targets/progress; the mutation keeps both the card and the dashboard in sync.

---

## Phase 1 — Realtime wiring (one place to change later)

### Step 1.1 — Invalidate the dashboard prefix from the realtime handler

**File:** `apps/web/src/realtime/realtime-handler.ts`

- Import the new key constants: `ONBOARDING_KEYS` from `../hooks/use-onboarding`, `DASHBOARD_KEYS` from `../hooks/use-dashboard`, `WEEKLY_GOAL_KEYS` from `../hooks/use-weekly-goal`.
- In the `event.resource === 'job'` branch, after the existing invalidations for `JOB_KEYS.lists()`, also call `qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false })` for `create`/`branch`/`delete`, and only when the status actually changed for `update`/`setActive` (to avoid spurious refetches).
- In the `event.resource === 'event'` branch, add `qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false })` for `create`/`update`/`delete` (the upcoming-events list and the greeting-bar event count both depend on it).
- In the `event.resource === 'tag'` branch, also invalidate the dashboard prefix for `create`/`update`/`delete` (tag chips show on upcoming events).
- In the `event.resource === 'result'` branch, on `create`, also invalidate the dashboard prefix (top ATS matches).
- In a new branch for `event.resource === 'apiKey'` (the spec lists `apiKey` in the realtime resources the spec relies on), invalidate both `DASHBOARD_KEYS.all` (for `hasAiKey`) and `ONBOARDING_KEYS.all` (so step 1 turns done without a manual refresh).
- **Why:** the spec says the dashboard reuses the existing realtime events instead of caching aggressively; doing it in one place means widget components stay dumb.

### Step 1.2 — Add the `apiKey` resource to the realtime validator

**File:** `apps/web/src/realtime/realtime-handler.ts`

- Extend the `isResourceChangedEvent` allowlist to include `'apiKey'` (the rest of the existing actions stay the same).
- **Why:** without this, the new `apiKey` branch added in Step 1.1 is dead code because the message is rejected by the type guard.

---

## Phase 2 — Routing

### Step 2.1 — Create the `/dashboard` route file

**New file:** `apps/web/src/routes/dashboard.tsx`

- Use `createFileRoute('/dashboard')({ component: DashboardRoute })` (TanStack Router file-based routing).
- `DashboardRoute` is a thin wrapper that renders `<DashboardView />` (added in Phase 4).
- **Why:** TanStack Router's file-based router picks this up automatically and regenerates `routeTree.gen.ts`; keeping the route file dumb lets the view live in `components/`.

### Step 2.2 — Style file for the route

**New file:** `apps/web/src/routes/style/dashboard.module.css`

- Single `.page` class: `padding: calc(var(--spacing) * 4); max-width: 1280px; margin: 0 auto;`.
- **Why:** the dashboard needs consistent page padding that doesn't depend on the shell layout.

### Step 2.3 — Make `/` redirect to `/dashboard` for authenticated users

**File:** `apps/web/src/routes/index.tsx`

- Replace the static welcome content with a small `useEffect` (or a `beforeLoad` redirect) that checks the existing auth state and either:
  - Navigates to `/dashboard` if signed in, or
  - Renders the existing welcome if signed out.
- If the project's auth state lives in `apps/web/src/store/user.slice.ts`, import it from there.
- **Why:** the spec says `/` should redirect authenticated users to `/dashboard` after login.

### Step 2.4 — Regenerate the route tree

**Command** (run by the user, not by us): `pnpm --filter web dev` (or any command that triggers the TanStack Router plugin). The new `/dashboard` route will appear in `apps/web/src/routeTree.gen.ts`.

- **Why:** the generated file is checked in but is regenerated automatically; never edit it by hand.

---

## Phase 3 — State 1: Onboarding

Build the onboarding view first because it is simpler and self-contained.

### Step 3.1 — Onboarding styles root

**New file:** `apps/web/src/components/dashboard/style/onboarding.module.css`

- Provide shared layout classes: `.page` (full-width single column), `.greeting` (large heading + secondary line), `.card` (shared card surface using `--black-700` background, `--grey-700` border, `--border-radius`), `.section` (vertical rhythm of `calc(var(--spacing) * 4)`).
- **Why:** onboarding has three sibling cards; a shared `.card` keeps the look consistent.

### Step 3.2 — Greeting block

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-greeting.tsx`

- Props: `{ displayName: string }`.
- Renders the heading `Welcome to JobFillPro, {displayName}` and the secondary line about 4 quick steps.
- Style: `style/onboarding-greeting.module.css` (sibling file) — just typography and spacing.
- **Why:** spec says it is static, so no data fetching inside.

### Step 3.3 — Progress card

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-progress-card.tsx`

- Props: `{ completedSteps: number; totalSteps: number }`.
- Renders the right-aligned label "X of 4 complete", a thin horizontal progress bar (CSS module animates `width` based on `completedSteps / totalSteps`), and the helper note.
- Style: `style/onboarding-progress-card.module.css` — `.bar` uses `background: var(--grey-700)` with an inner `.fill` using `var(--green-400)`.
- **Why:** read-only visual; the parent passes the counts from `OnboardingResponse`.

### Step 3.4 — Severity badge (small shared chip)

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-severity-badge.tsx`

- Props: `{ severity: 'required' | 'recommended' | 'optional' }`.
- Renders a small `EnhancedChip` whose color maps to the spec's three colors (red/amber/gray — use `--red-600`, `--yellow-400`, `--grey-500`).
- **Why:** used in every step header, so it lives in its own file.

### Step 3.5 — Step card

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-step-card.tsx`

- Props: `{ step: OnboardingStep; isExpanded: boolean; onToggle: () => void; children?: ReactNode }` where `children` is the expanded body.
- Renders: numbered circle on the left (becomes a check icon when `isComplete`), title + severity badge in the header, the short description always visible, the children only when `isExpanded`, and the primary CTA passed via `children` or a separate `cta` prop.
- Style: `style/onboarding-step-card.module.css` — handle the `isComplete` state (slight graying via `opacity: 0.7`).
- **Why:** the accordion contains four near-identical cards; one component keeps them in lockstep.

### Step 3.6 — Step bodies (the four CTAs)

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-step-bodies.tsx`

- Export four small components: `Step1Body`, `Step2Body`, `Step3Body`, `Step4Body`.
- Each returns the expanded body content described in the spec:
  - Step 1: a list of supported providers + "key is stored encrypted" note, plus a primary button "Go to settings" that navigates to `Settings → AI Configuration` (use a `useNavigate` from TanStack Router; if the settings route does not exist yet, route to a placeholder route added in Step 3.10).
  - Step 2: three side-by-side info cards (persona, resume, resume version) + "Go to persona and resumes" button that navigates to `/persona-resumes`.
  - Step 3: the flow description + "Go to extension" button that opens the extension sidebar (if no extension helper exists, the button can show a tooltip "Open the extension on a job listing page" — see Step 3.11).
  - Step 4: two side-by-side info cards + two buttons "Open Job Tracker" and "Skip for now".
- **Why:** each body is its own concern; keeping them out of `onboarding-step-card.tsx` keeps the card small.

### Step 3.7 — Skip-for-now helper hook

**New file:** `apps/web/src/hooks/use-skip-onboarding-step.ts`

- Exports a single hook returning `{ skippedSteps: Set<OnboardingStepKey>, skipStep(key), isSkipped(key) }`.
- The state is purely local (no backend call per the spec). Use `useState<Set<OnboardingStepKey>>`.
- **Why:** the spec is explicit that "Skip for now" is a local mark; isolating it in a hook makes the data flow obvious.

### Step 3.8 — Accordion container

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-accordion.tsx`

- Props: `{ steps: OnboardingStep[]; isLocallyComplete: (key) => boolean; expandedKey: OnboardingStepKey | null; onExpandedChange: (key) => void }`.
- Renders four `OnboardingStepCard`s. The first incomplete step (where "incomplete" means `!step.isComplete && !isLocallyComplete(step.key)`) is expanded on mount; completing a step auto-collapses and expands the next.
- Internal state holds the "currently expanded" key so the parent stays simple.
- **Why:** the spec calls out the accordion behavior precisely; it deserves its own file.

### Step 3.9 — Completion banner

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-completion-banner.tsx`

- Props: none (or `{ onGoToJobTracker: () => void }` for testability).
- Renders the green "You're all set!" card with the single "Go to Job Tracker" button.
- Style: `style/onboarding-completion-banner.module.css` — green background using `var(--green-500)` with `var(--white-900)` text.
- **Why:** only one place shows this banner; the parent gates it on `isComplete`.

### Step 3.10 — Onboarding orchestrator

**New file:** `apps/web/src/components/dashboard/onboarding/onboarding-view.tsx`

- Calls `useOnboarding()` from Step 0.2.
- Computes `effectiveSteps` by overlaying `skippedSteps` (from `useSkipOnboardingStep`) onto the server's `steps` array.
- Renders, in order: `OnboardingGreeting`, `OnboardingProgressCard`, `OnboardingAccordion`, and (conditionally) `OnboardingCompletionBanner` when `effectiveSteps.every(s => s.isComplete)`.
- Add a top-of-file comment describing the component and its four-step flow.
- **Why:** the spec calls this the "orchestrator" and lists it as the entry file for State 1.

### Step 3.11 — Placeholder settings route (only if missing)

**Action:** search `apps/web/src/routes/` for a Settings or AI Configuration route.

- If one exists, note its path and use it in Step 3.6.
- If not, create `apps/web/src/routes/settings.tsx` with a placeholder heading "AI Configuration" so the Step 1 CTA has a target. The placeholder can be replaced later.
- **Why:** the dashboard must build end-to-end even if Settings is not yet implemented; placeholder avoids a 404.

---

## Phase 4 — State 2: Full dashboard

Built after State 1 because every widget assumes the dashboard layout is wired.

### Step 4.1 — Dashboard styles root

**New file:** `apps/web/src/components/dashboard/style/dashboard.module.css`

- Shared classes: `.page` (the same as the route's), `.row` (flex with `gap: calc(var(--spacing) * 4)`, wraps on small screens), `.twoColumn` (a row that becomes single column below ~900px), `.card` (same as the onboarding one — actually consider exporting it from a shared `style/shared.module.css` if both onboarding and dashboard need it).
- **Why:** every widget reuses the same card surface and row layout.

### Step 4.2 — Empty-state component

**New file:** `apps/web/src/components/dashboard/dashboard-empty-state.tsx`

- Props: `{ title: string; message: string; ctaLabel?: string; onCtaClick?: () => void }`.
- Renders a centered text block + optional CTA button inside a card.
- **Why:** the General UI rules require every empty widget to show a message + CTA; one component makes compliance trivial.

### Step 4.3 — Greeting bar

**New file:** `apps/web/src/components/dashboard/dashboard-greeting-bar.tsx`

- Props: `{ email: string; eventsToday: number; onOpenExtension: () => void }`.
- Uses `getDisplayName(email)` and `getTimeOfDayGreeting()` from `apps/web/src/utils/dashboard.ts` (already implemented).
- Renders greeting, today's date, today's event count, and the "Open extension" button.
- **Why:** a top-level widget; independent of every other widget.

### Step 4.4 — AI key banner

**New file:** `apps/web/src/components/dashboard/dashboard-ai-key-banner.tsx`

- Props: `{ hasAiKey: boolean; onConfigure: () => void }`.
- Returns `null` when `hasAiKey === true`; otherwise renders the full-width blue info banner with the "Configure in settings →" link.
- **Why:** a pure presentational widget; the parent decides when to render it.

### Step 4.5 — Status metrics row

**New file:** `apps/web/src/components/dashboard/dashboard-status-metrics.tsx`

- Props: `{ metrics: DashboardResponse['metrics'] }`.
- Renders five equal-width cards (one per `JobStatus`). Each card shows the count, the status label, and `+N this week`.
- When a status has `count === 0` and `deltaThisWeek === 0`, use the empty-state pattern from Step 4.2 (per the General UI rules).
- Optional: clicking a card invokes an `onStatusClick(status)` prop so the page can later route to `/job-tracker?status=...`.
- **Why:** the most repeated widget on the page; gets its own file.

### Step 4.6 — Pipeline funnel

**New file:** `apps/web/src/components/dashboard/dashboard-pipeline-funnel.tsx`

- Props: `{ funnel: DashboardFunnel; range: DashboardRange; onRangeChange: (range) => void }`.
- Top section: one row per `stages[]` entry. Each row has a fixed-width status label, a filled bar (`width: ${percent}%`, color from a status→CSS-var map), a numeric count, and a drop-off annotation line between rows.
- Top-right controls: the range selector (use `EnhancedSelectDropdown` with options `This month` / `Last 3 months` / `All time`) and a small legend note highlighting the biggest drop-off stage in red.
- Bottom section: two side-by-side insight cards (`Biggest drop-off`, `Overall success rate`).
- **Why:** the centrepiece of the dashboard; deserves one dedicated file with its own CSS module.

### Step 4.7 — Weekly goal card

**New file:** `apps/web/src/components/dashboard/dashboard-weekly-goal.tsx`

- Props: `{ weeklyGoal: DashboardWeeklyGoal; isEditing: boolean; onEditToggle: () => void }`.
- Renders the card title, "resets Monday" subtitle, two progress bars (applications and interviews) and the current goal settings + "Edit goal →" link.
- When `isEditing === true`, render `<WeeklyGoalEditor />` instead of the progress bars.
- **Why:** a single visual concept split into display + editor.

### Step 4.8 — Weekly goal editor

**New file:** `apps/web/src/components/dashboard/weekly-goal-editor.tsx`

- Local state: `applicationsTarget` and `interviewsTarget` numbers initialized from props.
- Two `EnhancedTextField` inputs (one per target) + Save and Cancel buttons.
- Save calls `useUpdateWeeklyGoal()` from Step 0.4; on success, call `onSaved()` (passed by parent) to close the editor and the dashboard refetch happens automatically via the invalidation set up in Step 0.4.
- **Why:** keeping the editor separate from the display makes the read/write responsibilities obvious.

### Step 4.9 — Top ATS matches

**New file:** `apps/web/src/components/dashboard/dashboard-top-ats-matches.tsx`

- Props: `{ matches: DashboardTopAtsMatch[]; onJobClick: (jobId: string) => void }`.
- Renders up to 4–5 rows. Each row has the company-initial avatar (use `getCompanyInitial`-style helper from `apps/web/src/utils/dashboard.ts` if added, or inline), title, company, a small horizontal score bar, and the numeric score.
- Color of the score uses `scoreHexColor()` from `apps/web/src/utils/dashboard.ts` (already implemented).
- When the array is empty, render `<DashboardEmptyState />` with a CTA that navigates to `/job-tracker`.
- **Why:** reuses the score utilities that already exist.

### Step 4.10 — Upcoming events

**New file:** `apps/web/src/components/dashboard/dashboard-upcoming-events.tsx`

- Props: `{ events: DashboardUpcomingEvent[]; onJobClick, onTaskClick }`.
- Each row: colored left bar (3px, `background: event.tagColor`), job name + company, date + time, event type tag on the right.
- Clicking a row with `jobId` calls `onJobClick(jobId)`. Clicking a row with `jobId === null` (task tag) calls `onTaskClick(date)`.
- Empty state: "No upcoming events — add one in the Job Tracker" with a CTA to `/job-tracker`.
- **Why:** distinct click handlers for the two event kinds is the cleanest way to honor the spec.

### Step 4.11 — Persona breakdown

**New file:** `apps/web/src/components/dashboard/dashboard-persona-breakdown.tsx`

- Props: `{ breakdown: DashboardPersonaBreakdown[]; onPersonaClick: (personaId: string | null) => void }`.
- One row per persona: name on the left, `N jobs · N%` on the right, a filled horizontal bar (`width: ${percentage}%`) below.
- Empty state: "No jobs yet — add your first job" with a CTA to `/job-tracker`.
- **Why:** smallest widget; still gets its own file for symmetry and to keep `dashboard-view.tsx` short.

### Step 4.12 — Dashboard view orchestrator

**New file:** `apps/web/src/components/dashboard/dashboard-view.tsx`

- Calls `useDashboard({ range })`. The initial `range` defaults to `'month'`.
- Tracks `range` in `useState<DashboardRange>` and passes `onRangeChange` to the funnel.
- Renders, in order: `DashboardGreetingBar`, `DashboardAiKeyBanner` (only when `!hasAiKey`), `DashboardStatusMetrics`, `DashboardPipelineFunnel`, a two-column row of `DashboardWeeklyGoal` + `DashboardTopAtsMatches`, and a two-column row of `DashboardUpcomingEvents` + `DashboardPersonaBreakdown`.
- Owns the boolean state for the weekly-goal editor (`isEditingWeeklyGoal`).
- Passes a `navigate` callback down to event/row click handlers; click handlers call `useNavigate()`-driven navigation to `/job-tracker` (with optional query params) or open the job detail drawer.
- Add a top-of-file comment describing the dashboard layout and the two states (onboarding vs. full) — see Step 5.1.
- **Why:** the spec calls this the "layout orchestrator".

---

## Phase 5 — Route wiring

### Step 5.1 — Switch between State 1 and State 2 in the route component

**File:** `apps/web/src/routes/dashboard.tsx` (created in Step 2.1)

- Replace `DashboardRoute` body with: a small `DashboardRoute` component that calls `useOnboarding()` and renders `<OnboardingView />` if `!isComplete` and `<DashboardView />` otherwise. Show a lightweight `EnhancedCard`-based skeleton while `isLoading`.
- **Why:** the spec says "if `isComplete === true`, render State 2 instead of State 1" — keep the branching in one place.

### Step 5.2 — Quick visual check

**Action:** start the dev server and visit `/dashboard` while signed in as a new user (no persona, no job) to confirm State 1 renders, then complete one onboarding step and confirm the progress bar updates without a full page reload (proving the realtime wiring in Phase 1 works).

- **Why:** catches missing invalidations before any widget is built on top of them.

---

## Phase 6 — Polish & contracts

### Step 6.1 — Empty states on every widget

- Audit every widget created in Phase 4. If `data.length === 0` (or counts are all zero), render the shared `DashboardEmptyState` with a meaningful CTA.
- **Why:** the General UI rules explicitly forbid blank cards.

### Step 6.2 — Numeric context under every number

- Audit every number shown (status counts, delta-this-week, funnel percentages, ATS scores, goal progress). Make sure each one has either a delta below it or a context label so the user can interpret the number without remembering the previous state.
- **Why:** another explicit General UI rule.

### Step 6.3 — Verify the import path of shared types

- Run TypeScript build once and confirm `OnboardingResponse`, `DashboardResponse`, `WeeklyGoalResponse`, `UpdateWeeklyGoalInput`, `DashboardRange` are imported from `@repo/shared-types`, not redeclared.
- **Why:** the spec says to reuse shared types; a one-time check enforces it.

### Step 6.4 — Verify no inline CSS snuck in

- Grep the dashboard folder for `style={{` to confirm every `style` prop is either absent or comes from a CSS module class.
- **Why:** `.clinerules` forbids inline CSS.

### Step 6.5 — Verify all colors and sizes come from CSS variables

- Open the dashboard CSS modules and confirm there are no literal hex colors, pixel font sizes, or magic numbers for spacing — every one of them maps to a variable defined in `packages/ui/src/constants/css-constants.css` (or a `calc(var(--spacing) * N)`).
- **Why:** `.clinerules` mandates `css-constants.css` for colors and font sizes.

---

## What is **not** in this plan

To keep the plan focused and avoid scope creep:

- No backend changes — the spec lists three endpoints that are already served (`/api/dashboard/onboarding`, `/api/dashboard`, `/api/weekly-goal`) and `apps/web/src/services/dashboard-api.ts` already calls them.
- No new shared types — `packages/shared-types/src/dashboard.ts` is complete and re-exported from the barrel.
- No realtime additions — we only extend the existing handler with new invalidations and a new `apiKey` resource type.
- No extension work — the spec explicitly excludes the extension.
- No auth changes — the existing authenticated `axiosInstance` and the existing `RealtimeSyncProvider` are reused as-is.

---

## How another LLM should pick this up

1. Read the top of this file (the **Conventions** section) once and treat it as a style contract for every step below.
2. Walk the phases in order: **0 (data) → 1 (realtime) → 2 (routing) → 3 (onboarding) → 4 (dashboard) → 5 (wiring) → 6 (polish)**.
3. Inside each phase, follow the step numbers; each step is small enough to be implemented and PR'd on its own.
4. After each phase, the dev server should still build and the existing pages should still work — the dashboard feature is purely additive until Phase 5 wires the route.
