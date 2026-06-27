# Settings page — implementation plan

This plan turns the new `/settings` page in the web app into three stacked sections — **Account detail**, **API configuration**, and **Delete account** — plus the small backend changes required for paginated AI provider configs. Each step names the file to create/edit, explains the _why_ in one or two sentences, and references the existing patterns that should be copied. Follow the steps top-to-bottom; later steps assume earlier ones are done.

The plan is written for another LLM to pick up cold. If anything is unclear, read the linked files first — they are the source of truth for conventions.

---

## Conventions used in every step

- Web app code lives in `apps/web/src`. Backend lives in `apps/backend/src`.
- Shared types live in `packages/shared-types` and are re-exported from the barrel `packages/shared-types/src/index.ts`. New types must be added there (not redeclared locally).
- Reuse the existing authenticated `axiosInstance` from `apps/web/src/utils/axios.ts` and the React Query client wired in `apps/web/src/utils/query-client.ts`.
- Reuse `useStore` from `apps/web/src/store/index.ts` (Zustand) for user state — see `apps/web/src/store/user.slice.ts`. The store exposes `{ id, email, setUser, clearUser }`.
- Filenames are **kebab-case** (per `.clinerules`).
- **No inline CSS.** Every component pairs with a `*.module.css` file in `apps/web/src/components/style/`. Route-level styles go in `apps/web/src/routes/style/`. All colors, fonts, and spacing come from `packages/ui/src/constants/css-constants.css` (see the file for the variable names: `--white-900`, `--grey-700`, `--blue-500`, `--red-600`, `--border-radius`, `--spacing`, etc.).
- Add a short top-of-file comment to every new component describing its purpose and features (per `.clinerules`).
- Prefer the existing `Enhanced*` UI primitives from `@repo/ui` (`EnhancedButton`, `EnhancedTextField`, `EnhancedSelectDropdown`, `EnhancedTooltipWithText`, `Modal`, `Card`, `EnhancedSnackbar`) over reinventing them.
- Comments should explain _why_, not _what_ (per `.clinerules`). No decorative banners or section markers unless they add information.

---

## Phase 0 — Data layer (no UI yet)

These steps add the hooks/types the screen needs. They are independent of the `/settings` route, so the rest of the app keeps building while the page is being built.

### Step 0.1 — Extend the API key shared type with a paginated response

**File:** `packages/shared-types/src/api-key.ts`

- Add and export a new interface `PaginatedApiKeysResponse` mirroring the existing `PaginatedPersonasResponse` / `PaginatedJobsResponse` shape used elsewhere (`packages/shared-types/src/persona.ts`, `packages/shared-types/src/job.ts`):
  ```ts
  export interface PaginatedApiKeysResponse {
    items: ApiKeyData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }
  ```
- Re-export it from the barrel `packages/shared-types/src/index.ts` so both backend and web can import it as `@repo/shared-types`.
- **Why:** the web list is paginated, so it needs a typed wrapper instead of the bare `ApiKeyData[]` it currently returns.

### Step 0.2 — Make `GET /api/api-key` paginated and ordered

**File:** `apps/backend/src/controllers/api-key-controller.ts`

- Change `getApiKeys` to read `req.query` with `page`, `limit`, `search` (all optional; default `page=1`, `limit=10`).
- Validate inputs (positive integers) — extend `apps/backend/src/middlewares/api-key.ts` with a small `paginationSchema` reused by other paginated routes if one exists; otherwise inline the parsing.
- Order results by `createdAt DESC` so the newest provider is on top (per user feedback).
- Return `{ items, page, limit, total, totalPages, hasNextPage, hasPrevPage }` matching `PaginatedApiKeysResponse`.
- **Why:** the web list mirrors the resume/ATS pagination pattern in `apps/web/src/components/job-ats-tab.tsx`. Reusing the same shape keeps the hooks symmetric.

### Step 0.3 — Make the first saved key active by default

**File:** `apps/backend/src/controllers/api-key-controller.ts`

- In `upsertApiKey`, before inserting a new `ApiKey`, count how many keys the user already has.
  - If `count === 0`, set `newKey.active = true` on the insert.
  - Otherwise, set `newKey.active = false` (the user has to explicitly pick it later).
- Leave the existing `selectApiKey` controller (`PUT /api/api-key/select/:id`) untouched — it still toggles the active flag.
- **Why:** user feedback requires that the first provider created for a fresh user is automatically active; subsequent ones are not.

### Step 0.4 — Add the API key hook (paginated list + mutations)

**New file:** `apps/web/src/hooks/use-api-keys.ts`

- Mirror `apps/web/src/hooks/use-personas.ts` exactly (no separate `services/api-key-api.ts` per user feedback):
  - Export `API_KEY_KEYS = { all: ['api-keys'] as const, lists: () => [...API_KEY_KEYS.all, 'list'] as const }`.
  - Export `useApiKeys(limit: number = 10, searchQuery: string = '')` using `useInfiniteQuery` against `GET /api/api-key` with `params: { page, limit, search }` (return type `PaginatedApiKeysResponse`).
  - `getNextPageParam` / `getPreviousPageParam` follow the same shape as `usePersonas`.
  - Export `useCreateApiKey` (`POST /api/api-key`), `useUpdateApiKey` (same `POST /api/api-key` with `id` — the controller upserts), `useDeleteApiKey` (`DELETE /api/api-key/:id` with AbortController), `useSelectApiKey` (`PUT /api/api-key/select/:id`), and `useTestConnection` (`POST /api/api-key/test-connection`).
  - `onSuccess` for `useCreateApiKey`, `useDeleteApiKey`, `useSelectApiKey`: call `queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() })` so the list refetches with the new ordering/active flag.
  - `onSuccess` for `useUpdateApiKey`: patch the matching infinite-page entry via `queryClient.setQueriesData` using the same pattern as `useUpdatePersona`.
- **Why:** one hook file keeps the api-key surface small and consistent with `usePersonas`.

### Step 0.5 — Add the delete-account hook

**New file:** `apps/web/src/hooks/use-delete-account.ts`

- Export `useDeleteAccount()` returning a `useMutation` that calls `axiosInstance.delete('/user')`.
- **No `onSuccess` inside the hook** — the caller (the modal) owns the teardown/redirect so this hook stays reusable. Just throw on `success === false`, mirroring other hooks.
- **Why:** the modal in Phase 3 needs to clear the user store + React Query cache + cookie + redirect on success, which is too much for a hook to know about.

---

## Phase 1 — Realtime wiring (one place to change later)

### Step 1.1 — Invalidate the API key list from the realtime handler

**File:** `apps/web/src/realtime/realtime-handler.ts`

- Import `API_KEY_KEYS` from the new `../hooks/use-api-keys`.
- Find the existing branch that handles `event.resource === 'apiKey'` (the dashboard plan added it; if not present, add it next to the other `switch` arms).
- For `create` / `update` / `delete` / `select` actions, call `qc.invalidateQueries({ queryKey: API_KEY_KEYS.lists(), exact: false })`.
- **Why:** the settings page must stay in sync when the user adds/edits/deletes keys from the extension. Without this, the web list would be stale until a manual refresh.

---

## Phase 2 — UI components

Each subsection creates the new files for one of the three settings sections. Build Account detail first because it is the smallest; then API configuration; then Delete account.

### Step 2.1 — Account detail section

**New files:**

- `apps/web/src/components/account-detail-section.tsx`
- `apps/web/src/components/style/account-detail-section.module.css`

**Component requirements:**

- Reads `email` (and `id`) from `useStore((state) => state.email)`.
- On mount, if `email` is null, call `GET /api/user/me` (no hook needed — one-off `axiosInstance.get` inside a `useEffect`) and call `useStore.getState().setUser({ id, email })`. Use the type `UserPublic` from `@repo/shared-types` and follow the response unwrap style in `apps/web/src/services/dashboard-api.ts` (throw if `success === false`).
- Renders a single row inside a card-like surface:
  - Left: an `AccountCircle` MUI icon inside a circular avatar (`background: var(--blue-500); color: var(--white-900);` — same look as `.jobIcon` in `apps/web/src/components/style/job-tracker-card.module.css`).
  - Right: the email in `color: var(--white-900)`, secondary "Account" label in `color: var(--white-700)`.
- Pure read-only — no edit, no copy, no delete on this row.
- Top-of-file comment: "Account detail section — displays the authenticated user's email and a fallback hydration call to /api/user/me."
- CSS module: `.row` (flex, gap, padding), `.avatar` (40×40, blue-500 bg, white-900 fg, border-radius 50%), `.email`, `.label`.

**Why:** satisfies the "just the icon and email" requirement without pulling in a separate form.

### Step 2.2 — API configuration section: list + wizard

**New files:**

- `apps/web/src/components/api-configuration-section.tsx`
- `apps/web/src/components/style/api-configuration-section.module.css`
- `apps/web/src/components/api-key-card.tsx`
- `apps/web/src/components/style/api-key-card.module.css`

**Section component (`api-configuration-section.tsx`) requirements:**

- Holds local UI state for the add/edit wizard (same shape as the extension's `AiProvidersSection` in `apps/extension/src/components/ai-providers-section.tsx`):
  - `isAddingProvider: boolean`, `editingId: string | null`
  - `provider: string` (default `'gemini'`)
  - `credentials: Record<string, string>`
  - `connectionStatus: { type: 'success' | 'error'; text: string } | null`
  - `model: string`, `modelOptions: { label: string; value: string }[]`
  - `isTesting`, `isSaving`, `saveStatus`
- Wires:
  - `useTestConnection()` from Step 0.4 for the "Test Connection" button.
  - `useCreateApiKey()` / `useUpdateApiKey()` for the "Save" button (the backend upserts on `POST` — pass `id` when editing).
- Mirrors the extension wizard's provider options:
  ```ts
  const providerOptions = [
    { label: 'Gemini', value: 'gemini' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Groq', value: 'groq' },
    { label: 'Mistral', value: 'mistral' },
    { label: 'Ollama', value: 'ollama' },
    { label: 'Custom (Open AI Supported)', value: 'custom' },
  ];
  ```
- Credential fields are identical to the extension: `apiKey` always; for `openai` also `organizationId` + `projectId`; for `custom` / `ollama` also `customUrl` (required for `custom`, optional for `ollama`). Reuse the same visibility/UX rules.
- After a successful save: close the wizard, bump a `refreshKey` counter so the list refetches.
- The configured-providers list below the wizard uses `useApiKeys(10, debouncedSearch)` from Step 0.4 with infinite-scroll sentinels (see Step 2.3).

**`api-key-card.tsx` requirements (one row in the list):**

- Props: `{ keyData: ApiKeyData; isActive: boolean; isSettingActive: boolean; onSetActive: (id: string) => void; onEdit: (k: ApiKeyData) => void; onDelete: (id: string) => void; }`.
- Layout (three sections, mirroring `apps/web/src/components/resume-version-card.tsx`):
  - **Radio section** (`radioSection`): a Material `Radio` checked when `isActive`, disabled when `isActive`. Wrap it in `EnhancedTooltipWithText` with description `isActive ? 'Active' : 'Click to set as active'` (copy the exact tooltip string from the resume version card). Color the checked radio with `var(--blue-500)`.
  - **Data section**: provider initial avatar (same circle style as Step 2.1), provider name (`formatName(provider)`), `Model: ${model}` line, and an `ACTIVE` chip when `isActive` (use `EnhancedChip` from `@repo/ui`).
  - **Actions section**: `Edit` (OutlinedEdit MUI icon) and `Delete` (DeleteOutline MUI icon — color `var(--red-700)` on hover like the extension).
- Clicking the radio row invokes `onSetActive` only when `!isActive` (mirror `configured-providers.tsx`).
- CSS module: copy the layout shape from `apps/web/src/components/style/resume-version-card.module.css` (radioSection / dataSection / actionsSection + actionButton variants `.delete`).

**Infinite scroll container (in `api-configuration-section.tsx`):**

- Top/bottom `IntersectionObserver` sentinels + `pendingScrollRestoreRef`, **identical** to `apps/web/src/components/job-ats-tab.tsx`:
  - Capture the first visible card's id + offset before `fetchPreviousPage`, then restore after `isFetchingPreviousPage` flips back to `false`.
  - `data-result-id` attribute on each row maps to `data-key-id` here.
- Search: reuse the existing `SearchBar` component (see `apps/web/src/components/search-bar.tsx`) with 300 ms debounce.
- Empty state: a centered message in the section using `sectionStyles.emptyText` (from `apps/web/src/routes/style/section.module.css`).
- Loading state: `sectionStyles.loadingText`.
- Error state: `sectionStyles.errorContainer` + a retry `EnhancedButton` (colorTheme `secondary`).

**Top-of-file comments:**

- `api-configuration-section.tsx`: "API configuration section — add/edit AI providers and list them with infinite-scroll pagination. First created provider is active by default; user can switch later."
- `api-key-card.tsx`: "One row in the AI provider list. Radio selects active, edit/delete in actions."

**Why:** the requirements explicitly call out reusing the extension wizard shape and the resume-version-card radio pattern; the list mirrors `job-ats-tab.tsx` for pagination symmetry.

### Step 2.3 — Delete account section + modal

**New files:**

- `apps/web/src/components/delete-account-section.tsx`
- `apps/web/src/components/style/delete-account-section.module.css`
- `apps/web/src/components/delete-account-modal.tsx`
- `apps/web/src/components/style/delete-account-modal.module.css`

**Section component (`delete-account-section.tsx`) requirements:**

- Renders a card with a short warning message ("This will permanently delete your account, jobs, resumes, and AI configurations.") and a single destructive `EnhancedButton` (colorTheme that produces red — pick the closest existing theme; if none exists, use a CSS class with `background: var(--red-600); color: var(--white-900);` and pass via `customProps`).
- Button label "Delete Account". Clicking opens the modal.

**Modal component (`delete-account-modal.tsx`) requirements:**

- Reuse `Modal` from `@repo/ui` (see `packages/ui/src/modal.tsx`).
- Props: `{ isOpen: boolean; onClose: () => void; email: string }`.
- Body: a short paragraph + a controlled `EnhancedTextField` that asks the user to type their email to confirm.
- Footer: a "Cancel" `EnhancedButton` (colorTheme `secondary`) and a "Delete Account" destructive button that is **disabled** until the typed value strictly equals `email` (case-insensitive trim is fine).
- On confirm:
  1. Call `useDeleteAccount()` from Step 0.5.
  2. On success:
     - `useStore.getState().clearUser()`
     - `queryClient.clear()` (import the same `queryClient` instance used by `useApiKeys`/`usePersonas`)
     - Call `clearTokenAuth()` if it exists in `apps/web/src/utils/auth-sync.ts` (it does — the logout flow in `apps/web/src/routes/__root.tsx` calls it)
     - `navigate({ to: '/login' })`
     - Show a snackbar via `useStore((state) => state.showSnackbar)` with `"Account deleted"` at `severity: 'success'`.
  3. On error: show a snackbar with the message at `severity: 'error'`. Do not close the modal.
- CSS module: same shape as `apps/web/src/components/style/logout-confirm-modal.module.css` (overlay / modal / title / message / buttonContainer / cancelButton / confirmButton).

**Top-of-file comments:**

- `delete-account-section.tsx`: "Delete account section — triggers a confirmation modal; account deletion is irreversible."
- `delete-account-modal.tsx`: "Confirmation modal for account deletion. Requires the user to type their email before enabling the destructive action."

**Why:** the logout flow already proves the teardown sequence works; copying it keeps behavior consistent and reuses the existing `Modal` primitive.

---

## Phase 3 — Route wiring

### Step 3.1 — Rebuild the settings route

**File:** `apps/web/src/routes/settings.tsx`

- Replace the existing placeholder with three vertically stacked blocks inside the `.page` container:
  ```tsx
  <div className={styles.page}>
    <h1 className={styles.heading}>Settings</h1>
    <AccountDetailSection />
    <ApiConfigurationSection />
    <DeleteAccountSection />
  </div>
  ```
- Each section renders its own card surface; the page itself only provides padding + heading.
- Top-of-file comment: "Settings route — renders the three settings sections (account, AI providers, delete account) inside a single column."

### Step 3.2 — Extend the settings route styles

**File:** `apps/web/src/routes/style/settings.module.css`

- Add a `.page` rule (`max-width: 800px; margin: 0 auto; padding: calc(var(--spacing) * 4); display: flex; flex-direction: column; gap: calc(var(--spacing) * 6);`).
- Keep the existing `.heading` and `.description` rules for the heading + intro line.
- Section cards are styled inside each section's own CSS module; this file only owns the page chrome.
- **Why:** per `.clinerules`, every section owns its card styling and uses shared CSS variables.

### Step 3.3 — Add the `useMe` hydrate helper (optional refactor)

**File:** `apps/web/src/hooks/use-me.ts` (only if Step 2.1 needs it elsewhere)

- If `apps/web/src/components/account-detail-section.tsx` ends up duplicating hydration logic in the future, extract it into a `useMe()` hook that wraps `GET /api/user/me` and calls `useStore.getState().setUser` on success. Not strictly required for this plan.
- **Why:** flagged for future cleanup; not on the critical path.

---

## Phase 4 — Polish & contracts

### Step 4.1 — Empty states on every section

- Verify each section shows a friendly message when it has no data:
  - Account detail: nothing to show if email is null beyond the heading; show a small "Loading…" line until hydrated.
  - API configuration: when `items.length === 0`, render "No AI providers configured yet." inside the list area.
  - Delete account: nothing to show when closed.
- **Why:** the dashboard plan's Phase 6 calls this out as a UI rule; settings inherits the same expectation.

### Step 4.2 — Verify all colors and sizes come from CSS variables

- Open every new `*.module.css` file and confirm there are no literal hex colors, pixel font sizes, or magic spacing values. Every one of them must map to a variable defined in `packages/ui/src/constants/css-constants.css` (or `calc(var(--spacing) * N)`).
- **Why:** `.clinerules` mandates `css-constants.css` for colors and font sizes.

### Step 4.3 — Verify no inline CSS

- `grep -R "style={" apps/web/src/components/account-detail-section.tsx apps/web/src/components/api-configuration-section.tsx apps/web/src/components/api-key-card.tsx apps/web/src/components/delete-account-section.tsx apps/web/src/components/delete-account-modal.tsx apps/web/src/routes/settings.tsx` should return nothing.
- **Why:** `.clinerules` forbids inline CSS.

### Step 4.4 — Verify shared types are imported (not redeclared)

- After implementing, the only new shared type is `PaginatedApiKeysResponse`. It must be imported from `@repo/shared-types` everywhere; never redeclared.
- **Why:** mirrors the dashboard plan's Phase 6 contract.

### Step 4.5 — Smoke test

1. Sign in as a fresh user (no API keys yet).
2. Navigate to `/settings`. Expect: account detail row shows email; API configuration says "No AI providers configured yet."; delete-account card is present.
3. Click "Add New" → fill the wizard with Gemini credentials → Test Connection → Save.
4. Expect: the wizard closes, the list shows exactly one row with `ACTIVE`, the `ACTIVE` chip is visible, the radio is checked and disabled.
5. Add a second provider. Expect: it appears as a new row, NOT marked active, the first one remains active.
6. Click the second provider's radio. Expect: it becomes active (optimistically), the first one becomes inactive. Confirm with snackbar.
7. Refresh the page. Expect: same active provider.
8. Edit the second provider, change the model, save. Expect: model updates inline.
9. Delete the inactive provider. Expect: list refetches and shows one row again.
10. Open delete account, type the wrong email — confirm button stays disabled. Type the right email, confirm.
11. Expect: redirect to `/login`, store cleared, cookies cleared, snackbar visible.

---

## What is **not** in this plan

- No new AI provider logic on the backend — `apps/backend/src/services/api-key-service.ts` and the AI registry are reused as-is.
- No extension work — the extension already has a working `ai-providers-section.tsx`; this plan does not duplicate that flow on the extension side.
- No realtime schema changes — `event.resource === 'apiKey'` is already in the validator from the dashboard plan's Phase 1.
- No auth changes — `DELETE /api/user` already exists in `apps/backend/src/routes/user.ts` and is reused.

---

## How another LLM should pick this up

1. Read the top of this file (the **Conventions** section) once and treat it as a style contract for every step below.
2. Walk the phases in order: **0 (data) → 1 (realtime) → 2 (UI) → 3 (route) → 4 (polish)**.
3. Inside each phase, follow the step numbers; each step is small enough to be implemented and PR'd on its own.
4. After each phase, the dev server should still build and the existing pages should still work — the settings feature is purely additive until Phase 3 wires the route.
5. If a referenced file does not exist (e.g. an extension that you cannot see), open the closest sibling — `apps/web/src/components/job-ats-tab.tsx`, `apps/web/src/components/resume-version-card.tsx`, and `apps/web/src/hooks/use-personas.ts` are the canonical templates.

---

## Reference files (read these first)

- `apps/web/src/components/job-ats-tab.tsx` — pagination + sentinel pattern to mirror.
- `apps/web/src/components/resume-version-card.tsx` — radio + tooltip + active flag UX to mirror.
- `apps/extension/src/components/ai-providers-section.tsx` — wizard flow + provider options to mirror.
- `apps/extension/src/components/configured-providers.tsx` — list-row layout to mirror.
- `apps/web/src/hooks/use-personas.ts` — hook shape to mirror exactly.
- `apps/web/src/routes/__root.tsx` — logout teardown sequence to mirror in `delete-account-modal.tsx`.
- `apps/web/src/routes/style/section.module.css` — shared loading/empty/error states.
- `apps/web/src/components/style/logout-confirm-modal.module.css` — modal CSS shape.
- `packages/ui/src/constants/css-constants.css` — every CSS variable name used in this plan.
- `docs/dashboard-frontend-plan.md` — the sibling plan this file mirrors in style and phase structure.
