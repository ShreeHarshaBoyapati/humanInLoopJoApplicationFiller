# Dashboard UI specification

## Overview

The dashboard has two states depending on the user's setup status:

- **New user** — shows an onboarding checklist. The full dashboard is hidden until setup is complete.
- **Existing user** — shows the full dashboard with all data widgets.

---

## State 1: New user onboarding

### Layout

- Full-width single column
- Page greeting at the top
- Progress bar card below the greeting
- Accordion checklist of 4 steps below the progress card
- Completion banner appears at the bottom when all steps are done

---

### Greeting

**What it displays**
A welcome message addressed to the user's name. Static, no interaction.

Example: "Welcome to JobFillPro, Aryan"

secondary information — Let's get you set up in 4 quick steps so everything works from day one.

---

### Progress bar card

**What it displays**

- A label showing "X of 4 complete" on the right
- A thin horizontal progress bar that fills left to right
- A short note below: "Complete all steps to unlock the full dashboard"

**How the user interacts with it**
Read-only. Updates automatically as the user completes each step in the checklist below.

**What the user can infer**

- How far along they are in setup
- That there is a concrete end goal (4 steps) after which the dashboard unlocks
- That skipping steps means the dashboard stays locked

---

### Onboarding checklist

An accordion list of 4 steps. Only one step is expanded at a time. Completing a step auto-collapses it and auto-expands the next one. The user can also manually click any incomplete step to expand it.

Each step card contains:

- A numbered circle on the left (turns to a checkmark when done, grays out the card slightly)
- A title and severity badge on the right of the title row
- A short description visible at all times (1–2 lines)
- An expanded body section (only visible when the step is active) containing context, and a CTA button

Severity badges communicate urgency:

- **Required** (red) — the feature does not work without this step
- **Recommended** (amber) — the experience is significantly worse without it
- **Optional** (gray) — the user can skip and do it later

---

#### Step 1 — Configure your AI provider

**Severity:** Required

**What it displays**

- Title: "Configure your AI provider"
- Description: explains that the API key enables resume parsing,ATS scoring.
- Expanded body: a small info block listing supported providers (OpenAI, Anthropic, Gemini, Ollama) with a note that the key is stored encrypted
- CTA button: "Go to settings" — navigates to Settings → AI Configuration

**How the user interacts with it**
Clicks "Go to settings", configures their key there, then returns. The step is marked done either automatically (if the app detects the key was saved) or manually by the user.

**What the user can infer**

- AI features require their own API key — the app does not supply one
- Multiple providers are supported so they can use whichever they already have access to
- The key is safe to enter

---

#### Step 2 — Create a persona and add a resume

**Severity:** Required

**What it displays**

- Title: "Create a persona and add a resume"
- Description: explains that a persona groups jobs by role type and that each persona uses its own resume for ATS matching
- Expanded body: three side-by-side info cards explaining what a persona is, what a resume does in this context, and what resume version means.
- CTA button: "Go to persona and resumes" — navigates to the Persona and Resumes tab

**How the user interacts with it**
Clicks the CTA, creates a persona (e.g. "Fullstack Dev"), uploads a PDF resume, marks one as primary, and returns.

**What the user can infer**

- Personas are how the app separates different job search tracks (e.g. frontend vs backend)
- The resume uploaded here is what powers the ATS score — without it, ATS checking does not work
- They can create more personas later; one is enough to get started

---

#### Step 3 — Add your first job

**Severity:** Recommended

**What it displays**

- Title: "Add your first job"
- Description: go to job providing websites (LinkedIn, Indeed, company career pages), then click on the quick save button that appears on the screen due to extension which opens the extension and extracts the job details automatically. This is the most important step to get value from the dashboard, as it populates the pipeline and enables ATS checks.
- Expanded body: a flow of auto fill in the extension when the user clicks the quick save button on any job listing page. The flow should show how the extension extracts key details (job title, company, location, description) and saves them, then shows the marked resume and on analysis the ATS score and suggestions to improve it.
- CTA button: "Go to extension" — opens the extension on the side.

**How the user interacts with it**
Clicks the CTA, see the extension. else goes to other job listing pages and clicks the quick save button to see the flow in action. Then returns to the dashboard.

**What the user can infer**

- They do not have to manually fill in every field — the AI extracts the important parts
- This step is "Recommended" not "Required", meaning the dashboard will still unlock without it, but the job tracker will be empty
- The sooner they add a job, the sooner they can run an ATS check

---

#### Step 4 — Add an event or tag a job

**Severity:** Optional

**What it displays**

- Title: "Add an event or tag a job"
- Description: explains the two concepts — events (interview dates, follow-ups) appear on the dashboard calendar; tags (tasks or job related tags) helps to group the events
- Expanded body: two side-by-side info cards, one for events and one for tags
- Two buttons: "Open Job Tracker" (primary) and "Skip for now" (ghost)

**How the user interacts with it**
Either clicks the CTA to open the Job Tracker and add an event, or clicks "Skip for now" to mark the step done without doing anything. This is the only step with a skip option.

**What the user can infer**

- Events and tags are optional but improve planning and filtering
- They can always come back to this — skipping does not remove the feature
- The "Skip for now" option signals this is genuinely optional, not just soft-required

---

### Completion banner

**What it displays**
Appears below the checklist when all 4 steps are done. Green background.

- Heading: "You're all set!"
- Subtext: "Your dashboard is now fully unlocked. Start tracking jobs and running ATS checks."
- A single CTA button: "Go to Job Tracker" — takes the user to the Job Tracker page

**How the user interacts with it**
Clicks "Go to Job Tracker". This is the final step in the onboarding flow, so it should feel like a natural transition to start using the app.

**What the user can infer**

- Setup is complete
- The full dashboard is now available
- This is a one-time flow — they will not see it again

---

---

## State 2: Full dashboard (existing user)

### Layout

Top to bottom:

1. Greeting bar
2. AI key banner (conditional — only if key is not configured)
3. Five status metric cards (single row)
4. Pipeline funnel (full width)
5. Weekly goal + Top ATS matches (two columns, side by side)
6. Upcoming events + Persona breakdown (two columns, side by side)

---

### Greeting bar

**What it displays**

- User's name and a time-of-day greeting on the left (e.g. "Good morning, Aryan")
- Today's date and a count of events scheduled today on the left below the name
- An "Open extension" button on the right

**How the user interacts with it**
Clicking "Open extension" opens the extension sidebar on the current page. This is a persistent shortcut to the extension, which is the primary way users add jobs and run ATS checks, so it should be easily accessible from the dashboard.

**What the user can infer**

- How many events they have today at a glance without opening the calendar

---

### AI key banner (conditional)

**What it displays**
A blue info banner spanning full width. Shown only when the user has not configured an AI provider key.

- Icon + message: "AI key not configured — ATS scoring is disabled"
- A right-aligned link: "Configure in settings →"

**How the user interacts with it**
Clicking the link navigates to Settings → AI Configuration. The banner disappears permanently once a key is saved.

**What the user can infer**

- Which specific feature is blocked (ATS scoring) and why
- Exactly where to go to fix it
- That all other features still work — only AI-dependent ones are affected

---

### Five status metric cards

A single row of five equal-width cards, one per job status.

**Statuses shown:** Our job statuses.

**What each card displays**

- Count of jobs currently in that status (large number, color-coded per status)
- Status label below
- Delta below that: "+N this week" showing how many moved into this status in the current week

**How the user interacts with it**
Read-only. Clicking a card navigates to the Job Tracker filtered to that status (optional enhancement).

**What the user can infer**

- The current size of their pipeline at each stage
- Whether they have been active this week (the delta)
- At a glance: is the pipeline healthy? (e.g. many bookmarked but zero applied = stagnation)

---

### Pipeline funnel

Full-width card. The centrepiece of the dashboard.

**What it displays**

Top section — horizontal bar chart with one row per status:

- Each row has a status label on the left (fixed width), a filled bar in the middle, and a percentage on the right
- The bar width represents the percentage of total bookmarked jobs that reached this stage
- The bar fill color matches the status color
- The count is shown inside the right end of the bar
- Between each row, a small drop-off annotation: "↓ N% drop from [previous stage]"

Statuses shown in order: added (always 100%) → Applied → Interview → Offer → Rejected (shown separately as it is not a forward progression)

Top-right controls:

- A time range selector: "This month / Last 3 months / All time"
- A small legend note highlighting the biggest drop-off stage in red

Bottom section — two insight cards side by side:

- "Biggest drop-off": names the stage transition with the highest percentage loss, and explains it in one line
- "Overall success rate": percentage of bookmarked jobs that resulted in an offer, with the raw numbers

**How the user interacts with it**

- Time range selector changes the data shown in the bars and insight cards
- Otherwise read-only

**What the user can infer**

- Where exactly in the pipeline they are losing the most opportunities
- Whether the problem is volume (not applying enough) or conversion (applying but not getting interviews)
- Their overall success rate so they can benchmark improvement over time
- The drop-off annotations make the problem visible without the user having to calculate anything

---

### Weekly goal

Left card of the two-column row.

**What it displays**

- Card title: "Weekly goal" with "resets Monday" as a subtitle on the right
- Two progress bars, one for applications and one for interviews
- Each bar shows: label on the left, "X / Y" count on the right, a filled progress bar, and a small note below ("N more to hit your target")
- At the bottom: the current goal settings ("5 apps · 2 interviews / week") and an "Edit goal →" link

**How the user interacts with it**

- Read-only progress display
- "Edit goal →" opens the goal configuration (inline or modal) where the user can change the weekly targets

**What the user can infer**

- How much of this week's goal they have already completed
- How many more actions they need to take before the week resets
- What their current targets are without going to settings

---

### Top ATS matches

Right card of the two-column row.

**What it displays**

- Card title: "Top ATS matches" with "for bookmarked jobs" as a subtitle
- A list of up to 4–5 jobs, each showing:
  - Company initial avatar (circle with first letter)
  - Job title and company name
  - A small horizontal score bar and a numeric score (0–100) on the right
  - Score color: green (80+), amber (65–79), red (below 65)

**How the user interacts with it**

- Clicking a job row opens that job's detail drawer

**What the user can infer**

- Which of their saved jobs they are most qualified for right now
- Whether they should apply to a job or improve their resume first
- Which jobs are a poor fit and might not be worth time

---

### Upcoming events

Left card of the bottom two-column row.

**What it displays**

- Card title: "Upcoming events" with "next 5" as a subtitle
- A list of the next 5 calendar events across all jobs, ordered by date, each showing:
  - A colored left bar (3px wide, color = event type)
  - Job name and company (truncated if long)
  - Date and time below
  - Event type tag on the right

**How the user interacts with it**
Clicking an event row opens that job's detail drawer with the calendar section in focus. and for the task one it will open the job tracker only with that date selected in the calendar.

**What the user can infer**

- What they need to do or prepare for in the next few days
- Whether any deadlines or interview dates are coming up urgently
- A quick read of the type of activity (is this week heavy on interviews or follow-ups?)

---

### Persona breakdown

Right card of the bottom two-column row.

**What it displays**

- Card title: "Persona breakdown" with "by jobs added" as a subtitle
- A list of all personas, each showing:
  - Persona name on the left
  - "N jobs · N%" on the right
  - A filled horizontal bar below, width proportional to percentage of total jobs

**How the user interacts with it**
Read-only. Clicking a persona row navigates to the Job Tracker filtered to that persona (optional enhancement).

**What the user can infer**

- Which job search track they are most active in
- Whether they are spreading effort evenly or concentrating on one role type
- If a persona has very few jobs, it may need more attention or could be removed

---

## General UI rules

- All numbers that can change over time show a delta or context value below them so the user never has to remember the previous state to understand if the number is good or bad
- Empty states: if a widget has no data (e.g. no ATS checks run yet, no events added), it shows a short message explaining what will appear here and a direct CTA to create the missing data — never a blank card

---

## Backend API contract

The backend exposes three authenticated endpoints to power the dashboard. All endpoints require the standard auth middleware (Bearer token or `token` cookie) and operate on the currently logged-in user.

### Display name

The backend does **not** store a separate display name. The frontend derives a friendly name from the user's `email` (e.g. split on `@`/`.`, capitalize first segment) for both the new-user greeting and the full-dashboard greeting bar.

### `GET /api/dashboard/onboarding`

Returns the 4-step onboarding progress used by State 1. The frontend should call this once on dashboard load; if `isComplete === true`, render State 2 instead of State 1.

**Response 200**

```ts
{
  success: true,
  data: {
    isComplete: boolean;          // true when every step isComplete
    completedSteps: number;       // 0..4
    totalSteps: 4;
    steps: Array<{
      key: 'aiProvider' | 'personaAndResume' | 'firstJob' | 'eventOrTag';
      severity: 'required' | 'recommended' | 'optional';
      isComplete: boolean;
    }>;
  }
}
```

**Step completion rules (server-derived)**

| `key`              | `isComplete === true` when…                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `aiProvider`       | user has at least one `ApiKey` row with `active = true`                                                       |
| `personaAndResume` | user has at least one non-deleted persona that has a non-deleted resume with at least one non-deleted version |
| `firstJob`         | user has at least one `Job` row                                                                               |
| `eventOrTag`       | user has at least one `Event` row **or** at least one `Tag` row                                               |

The `eventOrTag` step has a `Skip for now` button in the UI — when the user clicks Skip, the frontend marks it complete locally (no backend mutation needed) so the checklist can collapse and the completion banner can show.

---

### `GET /api/dashboard?range=month|threeMonths|all`

Returns the full State-2 dashboard payload. `range` defaults to `month`. The frontend should refetch when the user changes the funnel time-range selector.

**Query params**

- `range` — `'month'` | `'threeMonths'` | `'all'` (default `'month'`)
- `topAtsLimit` — 1..10 (default `5`)
- `eventsLimit` — 1..20 (default `5`)

**Response 200**

```ts
{
  success: true,
  data: {
    user: { id: string; email: string };
    hasAiKey: boolean;                          // mirrors onboarding step 1; controls the AI key banner

    metrics: {
      total: number;                            // total jobs across all statuses
      byStatus: Array<{
        status: 'draft' | 'applied' | 'interview' | 'offer' | 'rejected';
        count: number;                          // jobs currently in this status
        deltaThisWeek: number;                  // jobs that moved INTO this status since Monday 00:00 (user-local)
      }>;
    };

    funnel: {
      range: 'month' | 'threeMonths' | 'all';
      stages: Array<{
        status: 'draft' | 'applied' | 'interview' | 'offer' | 'rejected';
        count: number;
        percent: number;                        // 0..100, percent of total jobs that reached this stage
        dropoffFromPrevPercent: number | null;  // null for the first row (draft); otherwise % drop from previous forward stage
      }>;
      biggestDropoff: { from: JobStatus; to: JobStatus; percent: number } | null;
      overallSuccessRate: { percent: number; offers: number; bookmarked: number };
    };

    weeklyGoal: {
      applications: { done: number; target: number };
      interviews:   { done: number; target: number };
      resetsOn: string;                         // ISO date (YYYY-MM-DD) of next Monday
    };

    topAtsMatches: Array<{
      jobId: string;
      title: string;
      companyName: string;
      score: number;                            // 0..100, MAX score across all results for this job
      personaName: string;
    }>;                                         // ordered by score DESC, limited by topAtsLimit

    upcomingEvents: Array<{
      id: string;
      title: string;
      jobName: string | null;                   // null for task-tag events (not linked to a job)
      companyName: string | null;
      date: string;                             // YYYY-MM-DD
      time: string | null;                      // HH:mm or null
      type: string;                             // tag.name (e.g. 'interview', 'follow-up', 'task')
      tagColor: string;                         // hex
      jobId: string | null;
    }>;                                         // date >= today, isCompleted = false, ASC, limited by eventsLimit

    personaBreakdown: Array<{
      personaId: string | null;                 // null = the "Unassigned" bucket (jobs with personaId = NULL)
      name: string;                             // "Unassigned" for the null bucket
      jobsCount: number;
      percentage: number;                       // 0..100, rounded to 1 decimal
    }>;                                         // ordered by jobsCount DESC; percentage sums to 100
  }
}
```

**Funnel calculation details**

- `stages[0]` (`draft`) is always `percent: 100` and `dropoffFromPrevPercent: null`.
- For `applied/interview/offer`, `percent = (count at stage / count of draft) * 100`.
- `rejected` is shown for completeness but is **not** a forward progression — its `dropoffFromPrevPercent` is computed against `applied` but it is excluded from `biggestDropoff`.
- `biggestDropoff` = the adjacent pair with the largest positive drop among `applied → interview → offer` (skipping rejected).
- `overallSuccessRate.percent = (offer / draft) * 100`.

**Weekly delta details**

- `deltaThisWeek` for status `S` = number of jobs whose `statusUpdatedAt[S]` is `>= startOfThisWeek` (Monday 00:00 in user-local time, returned as UTC from the server).
- `done` counts in `weeklyGoal` use the same rule — `applicationsDone = jobs where statusUpdatedAt.applied >= startOfThisWeek`, `interviewsDone` same for `interview`.
- `resetsOn` = next Monday at `YYYY-MM-DD` (user-local).

**Empty / zero states**

- All numeric fields default to `0`; arrays default to `[]`. The backend never returns `null` for these fields.
- The frontend should still render the per-widget empty messages from the General UI rules when the relevant array is empty.

---

### `GET /api/weekly-goal`

Returns the user's current weekly targets along with the computed progress for the current week. Auto-creates defaults (`applicationsTarget: 5`, `interviewsTarget: 2`) on first read.

**Response 200**

```ts
{
  success: true,
  data: {
    applicationsTarget: number;
    interviewsTarget: number;
    applicationsDone: number;
    interviewsDone: number;
    resetsOn: string;                           // YYYY-MM-DD of next Monday
    updatedAt: Date;
  }
}
```

### `PUT /api/weekly-goal`

Updates the user's weekly targets. Computed progress is computed on read (not stored).

**Body**

```ts
{
  applicationsTarget: number; // integer >= 1
  interviewsTarget: number; // integer >= 1
}
```

**Response 200** — same shape as `GET /api/weekly-goal`.

---

### Data model additions

A new entity `WeeklyGoal` (1:1 with `User`, `ON DELETE CASCADE`) backs the weekly-goal endpoints. No changes to `User`, `Job`, `Persona`, `Resume`, `Event`, `Tag`, or `Result` entities.

### Realtime

No new realtime events are emitted for the dashboard. The frontend can rely on the existing `job`, `event`, `tag`, `result`, `apiKey` resource-change events it already listens to, then refetch the dashboard summary when relevant.

### Auth

All endpoints sit behind the existing `authMiddleware`. No new permissions or scopes are introduced.

---

## Frontend implementation plan

### Scope

This section covers the web application implementation in `apps/web`. It does not cover the browser extension; extension-specific UI flows remain unchanged.

### Routing

- Add a new TanStack Router route at `/dashboard`.
- Make `/` redirect authenticated users to `/dashboard` after login.
- The dashboard route is the authenticated landing page.

### Data layer

- Add a dashboard API module in `apps/web/src/services/dashboard-api.ts` that calls the three backend endpoints and reuses types from `@repo/shared-types`.
- Add dashboard hooks in `apps/web/src/hooks/`:
  - `use-onboarding.ts` for `GET /api/dashboard/onboarding`.
  - `use-dashboard.ts` for `GET /api/dashboard?range=...`.
  - `use-weekly-goal.ts` for `GET /api/weekly-goal` and `PUT /api/weekly-goal`.
- Dashboard data changes frequently, so queries should not be aggressively cached. The hooks can rely on the existing realtime resource-change events (`job`, `event`, `tag`, `result`, `apiKey`) to trigger refetches instead of holding stale state.

### State 1 — New user onboarding

- `apps/web/src/components/dashboard/onboarding/onboarding-view.tsx` — orchestrator.
- `onboarding-progress-card.tsx` — progress bar and completion count.
- `onboarding-accordion.tsx` and `onboarding-step-card.tsx` — 4-step accordion with severity badges, expanded context, and CTAs.
- `onboarding-completion-banner.tsx` — shown when all steps are done.

Accordion behavior:

- One step expanded at a time.
- First incomplete step expanded on load.
- Completing a step auto-collapses it and expands the next incomplete step.
- Step 4 (`eventOrTag`) supports a local "Skip for now" action that marks it complete in the UI without a backend call.

CTAs navigate using the existing TanStack Router navigation:

- Step 1 → Settings → AI Configuration route.
- Step 2 → Persona and Resumes route.
- Step 3 → Job Tracker route (web only).
- Step 4 → Job Tracker route.
- Completion banner → Job Tracker route.

### State 2 — Full dashboard

- `apps/web/src/components/dashboard/dashboard-view.tsx` — layout orchestrator.
- `dashboard-greeting-bar.tsx` — greeting derived from `email`, today's date, today's event count.
- `dashboard-ai-key-banner.tsx` — shown when `hasAiKey === false`.
- `dashboard-status-metrics.tsx` — five status cards with counts and weekly deltas.
- `dashboard-pipeline-funnel.tsx` — horizontal bar chart with drop-off annotations, range selector, biggest drop-off insight, and overall success rate.
- `dashboard-weekly-goal.tsx` — two progress bars and an edit trigger.
- `weekly-goal-editor.tsx` — inline editor for application and interview targets.
- `dashboard-top-ats-matches.tsx` — top ATS matches with score bars.
- `dashboard-upcoming-events.tsx` — next events list.
- `dashboard-persona-breakdown.tsx` — persona distribution bars.

Each widget follows the General UI rules for empty states and numeric context.

### Styling

- All dashboard components use CSS modules in `apps/web/src/components/dashboard/style/`.
- Colors, font sizes, and spacing come from `packages/ui/src/constants/css-constants.css`.
- No inline CSS.

### Realtime

- The dashboard does not introduce new realtime events.
- The existing realtime handler invalidates dashboard queries when relevant resource-change events arrive.

### Auth

- The dashboard route uses the existing authenticated route wrapper.
- The API module uses the existing authenticated `api` instance.
