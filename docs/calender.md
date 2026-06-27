# Calendar Event Feature — Implementation Plan (v2)

## 0. Scope reminder

This plan covers: **DB schema, backend routes, shared types, frontend hooks, high-level component breakdown, and the "small calendar" pseudo-event logic**. Calendar library wiring (grid rendering, day dots, etc.) is intentionally deferred.

---

## 1. Database / TypeORM entities

### 1.1 `Tag` entity — `apps/backend/src/database/entities/tag.ts`

- `id` (uuid, PK)
- `name` (varchar) — non-empty, **unique per user** (composite unique index on `name + userId`)
- `color` (varchar) — hex; **generated server-side at create-time as a deterministic hash of the lowercased name** and persisted. Same name → same color across devices.
- `user` (ManyToOne → User, onDelete: CASCADE)
- `createdAt`, `updatedAt`
- No system flag. Reserved-name enforcement lives in the event controller (see §2.2).

### 1.2 `Event` entity — `apps/backend/src/database/entities/event.ts`

- `id` (uuid, PK)
- `title` (varchar, required)
- `description` (markdown text)
- `date` (date column — `YYYY-MM-DD`)
- `time` (varchar nullable — `HH:mm` or `null` for all-day)
- `tagId` (uuid, FK → Tag, **required** at create-time; the `Event.tag` ManyToOne carries `onDelete: 'CASCADE'` so deleting a Tag hard-deletes its events — see §2.1)
- `jobId` (uuid, FK → Job, **required** unless the linked tag's name is `"task"`)
- `isCompleted` (boolean, default `false`)
- `completedAt` (timestamptz, nullable)
- `user` (ManyToOne → User, onDelete: CASCADE)
- `createdAt`, `updatedAt`
- Indexes: `(userId, date)`, `(userId, tagId, date)`, `(userId, isCompleted, completedAt)`.
- Cascade: deleting a Job cascades its events; deleting a Tag cascades its events (events referencing the tag are hard-deleted via the FK cascade — see §2.1). `tagId === null` is treated as legacy/invalid and is not produced in v1.

### 1.3 `Job.statusUpdatedAt` — `apps/backend/src/database/entities/job.ts`

- New column: `statusUpdatedAt: Record<JobStatus, Date | null>` (JSON).
- On create: `{ draft: dataUpdatedAt ?? new Date(), applied: null, interview: null, offer: null, rejected: null, archived: null }`.
- **On status change** (in `JobController.update`), in addition to existing logic, recompute `statusUpdatedAt`:
  ```
  const ORDER: JobStatus[] = ['draft','applied','interview','offer','rejected','archived'];
  if (newStatus !== oldStatus) {
    const next = { ...job.statusUpdatedAt };
    next[newStatus] = new Date();
    const newIdx = ORDER.indexOf(newStatus);
    for (let i = newIdx + 1; i < ORDER.length; i++) {
      next[ORDER[i]] = null;
    }
    job.statusUpdatedAt = next;
  }
  ```
  Examples:
  - `draft → offer` → `offer: now`, all later statuses `null`.
  - `draft → offer → interview` → `interview: now`, `offer: null`, `rejected/archived: null`; `draft` unchanged.
  - `draft → applied → draft` → `draft: now`, `applied → interview → offer → ...` all `null`, but `draft` keeps the latest timestamp.
- Add to `validJobFields`, default select list, and `CreateJobSchema` default.

### 1.4 Register in `apps/backend/src/database/entities/index.ts`

```ts
import Tag from './tag.js';
import Event from './event.js';
export default [
  User,
  Job,
  ApiKey,
  Persona,
  Resume,
  ResumeVersion,
  VerificationCode,
  Result,
  Tag,
  Event,
];
```

### 1.5 New repos

- `tag-repo.ts`, `event-repo.ts` (mirroring `job-repo.ts`).

---

## 2. Backend routes, middlewares, controllers

### 2.1 Tag resource

Files: `apps/backend/src/middlewares/tag.ts`, `apps/backend/src/controllers/tag-controller.ts`, `apps/backend/src/routes/tag.ts`.

| Method | Path   | Validation            | Controller             |
| ------ | ------ | --------------------- | ---------------------- |
| POST   | `/tag` | `createTagValidation` | `TagController.create` |
| PUT    | `/tag` | `updateTagValidation` | `TagController.update` |
| DELETE | `/tag` | `deleteTagValidation` | `TagController.delete` |
| GET    | `/tag` | `getTagsValidation`   | `TagController.get`    |

- `create`: hash lowercased name → hex `color`, persist. Conflict on duplicate `(name, userId)` → 409.
- `get`: `search` (LIKE), `limit` (default 50, max 200). **No pagination** — returns `{ tags: Tag[] }`.
- `delete`: block if `name === 'task'` → 400 `Reserved tag cannot be deleted`. Otherwise simply `DELETE FROM tags WHERE id = ?` — related events are removed by the `Event.tag` FK cascade (§1.2). No transaction or `tagId` nulling is required.

### 2.2 Event resource

Files: `apps/backend/src/middlewares/event.ts`, `apps/backend/src/controllers/event-controller.ts`, `apps/backend/src/routes/event.ts`.

| Method | Path     | Validation              | Controller               |
| ------ | -------- | ----------------------- | ------------------------ |
| POST   | `/event` | `createEventValidation` | `EventController.create` |
| PUT    | `/event` | `updateEventValidation` | `EventController.update` |
| DELETE | `/event` | `deleteEventValidation` | `EventController.delete` |
| GET    | `/event` | `getEventsValidation`   | `EventController.get`    |

**`createEventValidation`**:

- `title: string` (required, min 1)
- `description: string` (default `''`)
- `date: string` (required, regex `^\d{4}-\d{2}-\d{2}$`)
- `time: string | null` (regex `^\d{2}:\d{2}$` or `null`)
- `tagId: uuid` (required)
- `jobId: uuid | null` (default `null`)

**`create` controller logic**:

1. Validate `tagId` belongs to user; load tag.
2. **Reserved-name rule**:
   - If `tag.name === 'task'` → `jobId` **must** be `null` (else 400).
   - For every other tag → `jobId` is **required** and must reference a job owned by the user (else 400).
3. Persist; `isCompleted=false`, `completedAt=null`.
4. Return `{ id }`.

**`updateEventValidation`**:

- `id: uuid` (required)
- All other fields optional, same constraints as create.
- `isCompleted: boolean | undefined` — controller sets `completedAt = isCompleted ? now() : null`.
- **After successful write, run cleanup rule** (§2.3).

**`deleteEventValidation`**: `{ id: uuid }`. After successful delete, run cleanup rule.

**`getEventsValidation`** (query):

- `mode: 'list' | 'dots'` (default `'list'`) — see `get` controller logic below.
- `page: number` (default 1, min 1, max 100) — `mode='list'` only.
- `limit: number` (default 20, min 1, max 100) — `mode='list'` only.
- `from?: date`, `to?: date` (optional date range; max 92 days when both provided).
- `tagId?: uuid`
- `jobId?: uuid`
- `includeCompleted?: boolean` (default `true`)
- `select?: string` (whitelisted by `validEventFields`)

**`get` controller logic** — the single `/event` endpoint serves two frontend needs; it branches on `mode`:

- **A) `mode='list'` (default) — events for the selected date, paginated.**
  - Filters by `userId`, optional `from/to`, `tagId`, `jobId`, and (if `includeCompleted === false`) `isCompleted = false`.
  - **Sort** is fixed: `isCompleted ASC, date ASC, time ASC NULLS FIRST, createdAt ASC` — non-completed first; within a page, the earliest dates/times come first. **No `sortBy`/`sortOrder` query params.**
  - Returns:
    ```
    ApiResponse<{
      events: Event[],
      pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage },
      statusPseudoEvents?: StatusPseudoEvent[]   // only when jobId is provided
    }>
    ```
  - `statusPseudoEvents` is computed **server-side** from the targeted job's `statusUpdatedAt` (per §2.4). For the big calendar's list view (no `jobId` filter), this field is omitted.
  - Consumed by `useEvents` (infinite). The fixed sort guarantees the user sees non-completed events first; completed events are reached by scrolling (`fetchNextPage`).

- **B) `mode='dots'` — calendar dots, no pagination.**
  - Returns a compact payload: the **distinct list of unique tags** that have at least one event for the user in the requested `from/to` window, **plus** the **distinct list of dates** that have any event. Shape:
    ```
    ApiResponse<{
      tags: { id: string; name: string; color: string }[],
      dates: string[],                            // YYYY-MM-DD
      statusPseudoEvents?: StatusPseudoEvent[]    // only when jobId is provided
    }>
    ```
  - `includeCompleted` is honored (default `true` so completed dots stay visible).
  - No `events[]` and no `pagination` is returned.
  - **Server-side union for `jobId`-scoped dots:** when `jobId` is provided, the controller unions `WHERE jobId = :jobId` with `WHERE tagId = :taskTagId AND userId = :userId` so the small calendar gets a single response containing the job's own events **and** the user-wide `task` events in one call. This keeps the call site to one query and one cache key.
  - `statusPseudoEvents` is included in the dots response when `jobId` is set (mirroring the list endpoint), so the frontend can render job status pseudo-events as dots without a second call.
  - Consumed by `useEventDots` (plain `useQuery`, not infinite).

### 2.3 Cleanup rule (in `EventController`)

Helper `enforceCompletedTaskCap(userId)`:

1. Find the user's `task` tag; if none → return.
2. `SELECT count(*) FROM event WHERE userId = ? AND tagId = ? AND isCompleted = true`.
3. If `> 100` → `DELETE FROM event WHERE ... ORDER BY completedAt ASC LIMIT 10`.
4. Called from `update` (after toggling `isCompleted`) and `delete`.

### 2.4 Status pseudo-events computation

Pure helper `computeStatusPseudoEvents(job: Job): StatusPseudoEvent[]`:

- For each non-null entry in `job.statusUpdatedAt`:
  - Convert timestamp to user's local `YYYY-MM-DD`.
  - Push `{ date, status, color: 'STATUS_PSEUDO' }`.
- De-duplicate by date: keep the status with the **latest** timestamp (so a back-and-forth on the same day collapses correctly).
- Sort by `date` ascending.
- Color is a single constant (`STATUS_PSEUDO`) used uniformly for all status dots regardless of status name.

### 2.5 Mount in `apps/backend/src/routes/index.ts`

```ts
import tag from './tag.js';
import event from './event.js';
router.use('/tag', tag);
router.use('/event', event);
```

---

## 3. Shared types — `packages/shared-types/src/`

- `tag.ts`: `Tag`, `CreateTagInput`, `UpdateTagInput`, `DeleteTagInput`, `GetTagsParams`, `TagList`.
- `event.ts`: `Event`, `EventList`, `EventDotsResponse`, `StatusPseudoEvent`, `CreateEventInput`, `UpdateEventInput`, `DeleteEventInput`, `GetEventsParams`, `EventField`.
- Re-export both from `index.ts`.
- `GetEventsParams` gains a `mode?: 'list' | 'dots'` field (default `'list'`, handled by the controller; the client always sets it explicitly to keep the call site self-documenting).
- `EventDotsResponse`:
  ```ts
  export interface EventDotsResponse {
    tags: { id: string; name: string; color: string }[];
    dates: string[]; // YYYY-MM-DD
    statusPseudoEvents?: StatusPseudoEvent[]; // present only when jobId is set
  }
  ```
- **No realtime changes** (WS integration is deferred).

### 3.1 Cross-cache invalidation

Deleting a tag now hard-deletes its events (§1.2, §2.1), so any UI showing event lists or dots must refresh. The tag-mutation hooks therefore invalidate **both** caches:

- `useDeleteTag.onSuccess` → `queryClient.invalidateQueries({ queryKey: TAG_KEYS.lists() })` **and** `queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() })`.
- `useUpdateTag.onSuccess` → invalidate `TAG_KEYS.lists()` only (events are not affected by a rename).
- `useCreateTag.onSuccess` → invalidate `TAG_KEYS.lists()` only.
  This is the single place where the tag + event caches intersect; nothing else needs cross-invalidation in v1.

---

## 4. Frontend hooks — `apps/web/src/hooks/`

- `use-tags.ts`:
  - `TAG_KEYS = { all: ['tags'], lists: () => [...TAG_KEYS.all, 'list'] }`
  - `useTags({ search?, limit? })` → **`useQuery`** (not infinite).
  - `useCreateTag`, `useUpdateTag`, `useDeleteTag` mutations; on success → invalidate `TAG_KEYS.lists()`.
  - `useEnsureTaskTag` helper: on first mount, check `useTags` result; if no tag with name `task` exists, call `useCreateTag` once (handled via `useEffect` + a `useRef` guard so it doesn't run repeatedly). Bootstrap is client-side, no server-side seed.
- `use-events.ts` exposes **two** hooks over the same `GET /event` endpoint (see §2.2 for the `mode=list` | `mode=dots` split):
  - `EVENT_KEYS = { all: ['events'], lists: () => [...EVENT_KEYS.all, 'list'], byJob: (id) => [...EVENT_KEYS.all, 'byJob', id], dots: (params) => [...EVENT_KEYS.all, 'dots', params] }`.
  - **`useEvents(params)`** — `useInfiniteQuery` mirroring `useJobs`. Params: `{ mode: 'list' | undefined, limit, from?, to?, tagId?, jobId?, includeCompleted? }`. The client always sets `mode: 'list'` (or omits, defaulting to it) to keep the call site self-documenting.
    - Query key includes all params so different calendar views don't share cache.
    - Server returns paginated `EventList`; the hook flattens pages for the list view.
    - The fixed `isCompleted ASC` sort means non-completed events appear first; completed events are reached by scrolling (`fetchNextPage`).
  - **`useEventDots(params)`** — plain `useQuery` (not infinite). Params: `{ mode: 'dots', from?, to?, tagId?, jobId?, includeCompleted? }`. Returns the `EventDotsResponse` shape from §3.
    - Query key: `EVENT_KEYS.dots({ from, to, tagId, jobId, includeCompleted })` — different calendar windows / job scopes have separate cache entries, so switching the visible month or the selected job refetches cleanly.
    - The hook flattens `dates` + `tags` + (optional) `statusPseudoEvents` into whatever the calendar panel needs. There is no "page" notion; the response is a single snapshot per range.
  - `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent` mutations; `onSuccess` invalidates **both** `EVENT_KEYS.lists()` and `EVENT_KEYS.dots(...)` (a mutation can shift either view).
  - `onError` surfaces via `useStore.showSnackbar`.

**No WS subscriptions.**

---

## 5. Frontend components (high-level)

All new files in kebab-case. CSS in `apps/web/src/components/style/*.module.css`. Colors/sizes from `packages/ui/src/constants/css-constants.css`. **No inline CSS.**

### 5.1 `JobTrackerSection` — right side

- New `<BigCalendarPanel />` next to the existing job list (layout split).
- Composed of:
  - `<CalendarHeader />` — month nav, today button (deferred library; we render the chrome only)
  - `<CalendarGrid />` — placeholder (deferred) for the **grid rendering only**. The dots shown under each day cell come from `useEventDots({ from, to })` per §5.1.1; the placeholder grid reads from that hook once the calendar library is wired.
  - `<EventsHeaderRow />` — "Events" left, "Add Event" right
  - `<EventsList />` — list of `EventCard`s for the selected date (default = today), fed by `useEvents({ mode: 'list', date: selectedDate, ... })` (infinite). Non-completed events appear first; completed ones are reached by scrolling.
- The big calendar covers **all** the user's events in the visible month. It does **not** show job-status pseudo-events; those are only visible in the small calendar of the relevant job (see §5.1.1).

### 5.1.1 Calendar dot rules (big vs small)

Both `<BigCalendarPanel />` and `<SmallCalendarPanel />` render dots from the same backend source (`mode='dots'` per §2.2) but apply **different inclusion rules**. The split is entirely client-side: the backend always returns everything it can; the panel decides what to show.

- **Big calendar (`JobTrackerSection`, no `jobId`):**
  - Calls `useEventDots({ mode: 'dots', from, to })` — no `jobId` is passed, so the server omits `statusPseudoEvents` entirely.
  - Dots on a day are rendered from the returned `dates[]` (a date with any events shows up to N dots, then `+N`). Each dot's color comes from the corresponding `tags[]` entry by tag id.
  - Net effect: the big calendar shows **all** events the user has in the visible month across **all** jobs and tags, but **excludes** job-status pseudo-events (which are per-job, not user-wide, and would be misleading out of context).

- **Small calendar (`JobDetailSidebar`, `job` is in scope):**
  - Calls `useEventDots({ mode: 'dots', from, to, jobId })` — the server unions `jobId` events with user-wide `task` events (§2.2) and includes `statusPseudoEvents` in the same response.
  - Dots on a day are the union of:
    1. Events linked to this `jobId` (any non-`task` tag) — colored by their tag's color.
    2. User-wide `task` events on that day — colored by the `task` tag's color.
    3. `statusPseudoEvents` for the job — rendered with the `STATUS_PSEUDO` color constant.
  - Same `2 + N` visual rule as the big calendar.

- **Why one hook, two inclusion rules:** the `mode='dots'` payload shape is already designed so the server can answer "give me everything relevant to this view" in one call. The frontend filter is therefore trivial (`statusPseudoEvents?.length > 0` to decide whether to paint them), and the cache key cleanly partitions big-calendar-month vs small-calendar-job.

### 5.2 `EventCard`

- Left: `Radio` (Material); toggle → `useUpdateEvent({ isCompleted })`; on success, line-through title + dim.
- Body:
  - Line 1: `Job title @ Company name` (ellipsis + `EnhancedToolTip` for full name) + tag chip (background = tag color).
  - Line 2: `time` (`HH:mm` or `All day`).
  - Line 3: `date` — **user-facing format `DD-MM-YYYY`** (e.g. `07-11-2026`). The machine format on the wire stays `YYYY-MM-DD`; the display string is produced by a shared util `formatDateDDMMYYYY(date: string): string` in `apps/web/src/utils/date.ts`, used here and anywhere else a date is shown to the user.
  - Description: **rendered as markdown** via the shared `<Markdown />` component extracted from `job-notes-tab.tsx` (same `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize` pipeline, lazy-loaded with the existing `MarkdownLoading` fallback). Capped height + ellipsis by default; on hover expand + vertical scroll.
  - On hover, two right-aligned action buttons at the bottom: **Edit** (open `AddEventModal` in edit mode), **Delete** (open `ConfirmModal` with `confirmLabel="Delete"`, `cancelLabel="Cancel"`).

### 5.3 `AddEventModal`

The `AddEventModal` has **two views**, swapped in place by toggling `view: 'form' | 'manageTags'` in the modal's local state. The modal chrome (close button) and footer stay; only the body and header title swap. No new modal file is stacked on top.

- **View: `form` (default).** Header: `Add Event` / `Edit Event`. Body: the fields below. A small **Manage** button (`EnhancedButton colorTheme="secondary" size="small" label="Manage"`) sits next to the **Type** autocomplete. Clicking it transitions to View: `manageTags`, **preserving** the in-progress form state (a single shared `useState` for the form values; the view switch is purely visual).
  - **Type** (autocomplete) — debounced 300ms `useTags({ search })`. **Purely selection**; the `+ Create tag` inline action is gone — use the Manage button.
  - **Job** (autocomplete) — `useJobs` for selection; **disabled + cleared + helper text** when the selected tag is `task`. When the modal is opened from the small-calendar's `Add Event` button (§5.4) with a job pre-selected, the **Type** dropdown is also restricted to non-`task` tags (the job is already in scope, so a task event would be invalid; this mirrors the controller's reserved-name rule, §2.2).
  - **Date** (`EnhancedTextField` `type="date"`, default = currently selected calendar date; machine format `YYYY-MM-DD` on the wire, displayed as `DD-MM-YYYY` per §5.2).
  - **Time** (`EnhancedTextField` `type="time"`).
  - **Description** (`TextInputArea` `md` mode; rendered as markdown in the card via the shared `<Markdown />`, §5.2).
- **View: `manageTags` — see §5.6.** Header swaps to a back-arrow + title `Tags`. Clicking the back-arrow returns to View: `form`, restoring the form's in-progress state.
- Same modal for create + edit (prefill on edit, `PUT /event`). In edit mode, the **Manage** button is still available; the `useTags` options auto-include the currently-selected tag.

### 5.4 `JobDetailSidebar` — right section

- Replace placeholder with `<SmallCalendarPanel job={job} />`:
  - **Dots** for the mini grid come from `useEventDots({ mode: 'dots', from, to, jobId })` per §5.1.1 (small-calendar rules: job events + user-wide `task` events + status pseudo-events). Same `2 + N` visual rule (`+N` overflow chip after two visible dots).
  - Below: `EventsHeaderRow` + `EventsList` fed by `useEvents({ mode: 'list', jobId, date: selectedDate, ... })` (infinite, §4). The fixed `isCompleted ASC` sort means non-completed events appear first; completed ones are reached by scrolling (`fetchNextPage`). The `+N` overflow from the dots is a visual hint that the list below may be long.
  - **Add-Event** button → opens `AddEventModal` (§5.3) in create mode with `job` pre-selected (and `tagId` restricted to non-`task` tags, see §5.3). Date pre-fills to the currently selected calendar date.
  - `statusPseudoEvents` from the `mode='dots'` response (and from the list response when `jobId` is set) are merged into the dots with the `STATUS_PSEUDO` color constant.

### 5.5 Reuse

- `ConfirmModal` for delete (pass `confirmLabel="Delete"`, `cancelLabel="Cancel"`).
- `EnhancedAutocompleteDropdown`, `EnhancedButton`, `EnhancedTextField`, `EnhancedToolTip`, `Modal`, snackbar.
- `JobDetailSidebar` `ConfirmModal` already passes labels — we follow the same pattern.

### 5.6 In-modal tag management view (`AddEventModal` `view: 'manageTags'`)

The **same `AddEventModal`** renders this view in place of the form body (see §5.3 for the view toggle). No separate modal file. The `useEnsureTaskTag` helper (§4) guarantees a `task` tag exists before this view is reachable.

**Header.** A back-arrow button on the left + the title `Tags`. Clicking the back-arrow returns to `view: 'form'`, restoring the in-progress form state.

**Footer.** The primary `Add` / `Save` footer is hidden in this view (per-row actions handle their own state).

**Body, top to bottom:**

1. **Search row.**
   - `EnhancedTextField` (placeholder `Search tags...`) on the left; debounced 300ms feeds `useTags({ search, limit: 200 })`.
   - `+ Add tag` `EnhancedButton` (`colorTheme="primary"`, `size="small"`) on the right. The button is **always enabled** in v1; it is only disabled while the inline add-tag row is already open (one add in flight at a time). There is no text-length gating.
   - A horizontal divider sits below this row.

2. **List of existing tags** (scrollable). Each row is a card with:
   - **Left:** a small color swatch (the tag's deterministic hex color) + the tag's name as a `Typography` label.
   - **On hover:** two right-aligned icon buttons appear: **Edit** (pencil) and **Delete** (trash).
   - **On click of Edit:**
     - The label name swaps in place to an inline `EnhancedTextField` (autofocused, full text selected).
     - The Edit + Delete buttons swap to a **green tick** (save) and a **red cross** (cancel).
     - Pressing Enter in the field or clicking the tick calls `useUpdateTag`. On success, the row collapses back to display mode. The cross discards and reverts.
     - Optimistic update of the cache; on error, revert + `showSnackbar`.
   - **On click of Delete:**
     - Opens `ConfirmModal` (stacked on top of the event modal, since this is a destructive confirm) with `title="Delete Tag"`, `message="Are you sure you want to delete the tag \"{name}\"? Any events using it will be deleted."`, `confirmLabel="Delete"`, `cancelLabel="Cancel"`. On confirm → `useDeleteTag` → close the confirm modal, refetch the tag list.
     - **Form-state side effect:** on `useDeleteTag.onSuccess`, the modal clears its form's `tagId` if the deleted tag was the one currently selected (see §3.1 — the tag + event caches are invalidated, so the autocomplete will not list the deleted tag on the next render anyway). This is the only place a tag mutation reaches into the form's state from this view.
   - **The `task` tag row:**
     - No Edit button. The `task` name is reserved; the controller doesn't reject a no-op `PUT /tag` that doesn't change the name, but we don't surface the edit affordance in v1.
     - Delete button is rendered **disabled** with an `EnhancedToolTip` whose `title` is `Reserved tag cannot be deleted` (verbatim from the controller's 400 message).

3. **Inline add-tag row** (appears below the search row **only** when the user clicks `+ Add tag`, not on text-entry):
   - A row-shaped card with an inline `EnhancedTextField` (placeholder `New tag name`, auto-focused) on the left and a **green tick** (confirm-add) on the right.
   - Pressing Enter in the field or clicking the tick calls `useCreateTag`. On success: the new row appears in the list (with a brief highlight / scroll-into-view), the inline add row closes, and `useTags` is refetched.
   - The user **stays in the manage view** after a successful add; they navigate back to the event form manually via the back-arrow. We **do not** auto-update the form's `tagId` at this point — the new tag is just a row in the list; if the user wants it as the form's selected tag, they go back to the form and pick it from the **Type** autocomplete.
   - The `+ Add tag` button re-enables when this row is closed (either by completing the add or by Escape / clicking elsewhere).

**Cache wiring.** All three tag mutations are `useTags`-cache-aware per §3.1 (`useDeleteTag` also invalidates `EVENT_KEYS.lists()` so the small calendar's dots refetch). Errors surface via `useStore.showSnackbar`. The `task` row's no-edit / no-delete state is rendered with disabled buttons + tooltips, **not** by gating the mutation hooks — the server is still the source of truth and would return 400 if called.

---

## 6. Job `statusUpdatedAt` controller logic — exact spec

```
const ORDER: JobStatus[] = ['draft','applied','interview','offer','rejected','archived'];
if (newStatus !== oldStatus) {
  const next = { ...job.statusUpdatedAt };
  next[newStatus] = new Date();
  const newIdx = ORDER.indexOf(newStatus);
  for (let i = newIdx + 1; i < ORDER.length; i++) {
    next[ORDER[i]] = null;
  }
  job.statusUpdatedAt = next;
}
```

---

## 7. Accepted items from §8 of v1

- 8.1 Timezone: browser-local for now.
- 8.2 Recurring events: out of scope.
- 8.3 All-day = `time = null`. No `isAllDay` flag.
- 8.5 Markdown renderer: **in scope for v1.** Description is stored as markdown and **rendered as markdown** in the `EventCard` (§5.2) via the shared `<Markdown />` component extracted from `job-notes-tab.tsx`. No preview / no toggle in v1.
- 8.7 Migration: rely on `synchronize: true`.
- 8.8 `task` tag bootstrap: client-side via `useEnsureTaskTag`.
- 8.9 Reserved-name rule: enforced in `EventController` create/update.

## 8. Explicitly skipped / handled

- 8.4 (modal footer labels): `ConfirmModal` already accepts labels — we pass `confirmLabel="Delete"` for event delete.
- 8.6 (WS dispatcher): skipped per direction.
- 8.10 (soft delete): hard delete everywhere.

---

## 9. Suggested order of work

1. Entities + repos + entity index update + `Job.statusUpdatedAt` column. The `Event.tag` ManyToOne gets `onDelete: 'CASCADE'` per §1.2.
2. `Tag` middleware + controller + route + shared types. Update `tag-controller.ts` `delete` to drop the transaction (cascade handles related events, §2.1).
3. `use-tags.ts` + `useEnsureTaskTag` helper.
4. **Shared `<Markdown />` extraction** — pull the `react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize` + `markdownComponents` + `MarkdownLoading` block out of `job-notes-tab.tsx` into a new file (e.g. `apps/web/src/components/markdown.tsx`) exporting both the `<Markdown />` default and the `MarkdownLoading` named export. `job-notes-tab.tsx` re-imports from it.
5. **`formatDateDDMMYYYY` util** — new `apps/web/src/utils/date.ts` exporting `formatDateDDMMYYYY(date: string): string` (input is the wire `YYYY-MM-DD`; output is `DD-MM-YYYY`). Used initially by `EventCard` (§5.2); exported for other call sites.
6. `Event` middleware + controller (incl. status pseudo-events + cleanup rule) + route + shared types. **Add `mode='list' | 'dots'` to `getEventsValidation`**; branch in the controller (§2.2); add the server-side union for `jobId`-scoped dots; add `EventDotsResponse` to shared types (§3).
7. `use-events.ts` — split into `useEvents` (infinite, `mode='list'`) and `useEventDots` (`useQuery`, `mode='dots'`) per §4. Update `EVENT_KEYS` to add `dots(...)`.
8. Frontend: `AddEventModal` (with the in-modal `view: 'manageTags'` toggle per §5.3 / §5.6), `EventCard` (markdown via shared `<Markdown />`; date via `formatDateDDMMYYYY` per §5.2), shared `EventsHeaderRow` / `EventsList`.
9. `BigCalendarPanel` integration in `JobTrackerSection` — grid remains a placeholder; the placeholder grid reads from `useEventDots({ from, to })` per §5.1.1 (big-calendar rule, no status pseudo-events).
10. `SmallCalendarPanel` integration in `JobDetailSidebar` — reads from `useEventDots({ from, to, jobId })` (server-side union; status pseudo-events visible per §5.1.1) + `useEvents({ jobId, date, ... })` (infinite) for the list. `computeStatusPseudoEvents` is folded into the dots hook's response; no separate call.
11. `JobController.update` update logic for `statusUpdatedAt`.
12. **Verification pass** — exercise the big-vs-small dot rule (§5.1.1) end-to-end: on the big calendar, switch months and confirm the `EVENT_KEYS.dots({ from, to })` cache key partitions cleanly; on the small calendar, switch jobs and confirm the `EVENT_KEYS.dots({ from, to, jobId })` key refetches; delete a tag in the in-modal manage view and confirm the small calendar's dots refetch (cross-cache invalidation, §3.1).

## 10. Coding rules

- **No comments at every change point.** Code is the _what_. The _why_ of any non-obvious decision lives here in `docs/calender.md`, not scattered through the code.
- **Inline comments are reserved for genuinely non-obvious _why_** — e.g. a tricky WebSocket lifecycle detail, a `bufferedAmount` check, a place where the obvious code would be wrong. If removing the comment still leaves the code clear, remove the comment.
- **Explanations of shape, design, and trade-offs go in this doc**, in the relevant checkpoint section or in a dedicated "Implementation notes" sub-section added when needed.
- The big-vs-small dot rule (§5.1.1) and the in-modal tag-management UX (§5.6) are exactly the kind of non-obvious design decisions that belong in this doc, not scattered as comments through the components — the component code is the _what_, the doc is the _why_.
- When in doubt, write the _why_ in `docs/calender.md`, not in the code.
