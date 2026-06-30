# Extension settings page — implementation plan

This plan turns the new `/settings` route in the **extension** into a read-only mirror of the web app's settings page, scoped to the side panel. The route currently shows an account-detail card and an `AiProvidersSection` that can _create / edit / delete_ providers. We will:

- Keep the account-detail card as-is.
- Remove the create/edit/delete wizard, the "Add New" header button, and the edit/delete buttons on every card.
- Add a paginated, IndexedDB-cached **read-only list** of providers (mirroring the web list).
- Show provider credentials in **hidden** form, with an eye icon that reveals the underlying value (decrypted via the existing `DECRYPT_API_KEY` background action).
- Replace the green `ACTIVE` chip with a Material `Radio` row (only the active provider's radio is checked, the radio is disabled when active; clicking a non-active radio fires `SELECT_PROVIDER`).
- Wire the list to the existing `RESOURCE_CHANGED` websocket event so the cache (and the visible list) updates on `create / update / delete / setActive`.
- **Drop the `Delete Account` section** — it stays in the web app only.

Each step names the file to create/edit, explains the _why_, and references the existing patterns that should be copied. Follow the steps top-to-bottom; later steps assume earlier ones are done.

The plan is written for another LLM to pick up cold. If anything is unclear, read the linked files first — they are the source of truth for conventions.

---

## Conventions used in every step

- Extension code lives in `apps/extension/src`. Web lives in `apps/web/src`. Backend lives in `apps/backend/src`.
- Shared types live in `packages/shared-types` and are re-exported from the barrel `packages/shared-types/src/index.ts`. New types must be added there (not redeclared locally).
- Filenames are **kebab-case** (per `.clinerules`).
- **No inline CSS.** Every component pairs with a `*.module.css` file. Route-level styles go in `apps/extension/src/routes/style/`. Component-level styles for the side panel go in `apps/extension/src/components/style/`. All colors, fonts, and spacing come from `packages/ui/src/constants/css-constants.css` (see the file for the variable names: `--white-900`, `--grey-700`, `--blue-500`, `--red-600`, `--border-radius`, `--spacing`, etc.).
- Add a short top-of-file comment to every new component describing its purpose and features (per `.clinerules`).
- Prefer the existing `Enhanced*` UI primitives from `@repo/ui` (`EnhancedButton`, `EnhancedTextField`, `EnhancedTooltipWithText`) over reinventing them.
- Comments should explain _why_, not _what_ (per `.clinerules`). No decorative banners or section markers unless they add information.
- The side panel is the only consumer of the extension's IndexedDB cache today. Anything we cache must work for the side panel's lifetime (not the background worker's), so the `useReducer + cache hook + IntersectionObserver` pattern in `apps/extension/src/components/personas-section.tsx` is the canonical template.
- The `RESOURCE_CHANGED` message is broadcast from the background worker (`apps/extension/src/realtime/realtime-owner.ts`) to the side panel via `chrome.runtime.sendMessage`. Listeners attach with `chrome.runtime.onMessage.addListener` exactly as `personas-section.tsx`, `resume-section.tsx`, `recent-jobs.tsx` and `job.tsx` already do.

---

## What this plan keeps from the existing files

- `apps/extension/src/routes/settings.tsx` — kept; the account-detail card and `GET_CURRENT_USER` loader are already correct. We just drop the `DeleteAccountSection` slot and replace the `AiProvidersSection` import with the new read-only `ProvidersListSection`.
- `apps/extension/src/components/ai-providers-section.tsx` and `apps/extension/src/components/configured-providers.tsx` — these are the **wizard** + **list** we are replacing. They are deleted in Phase 4. Their styles in `apps/extension/src/routes/style/settings.module.css` are partially reused (the `.container / .header / .backBtn / .headerTitle / .aiStatusArea / .aiStatusCard / .aiStatusLabels / .aiStatusTitle / .aiStatusValue / .section / .sectionHeader / .sectionTitle / .sectionHeading` rules) and the unused rules (`.addProviderForm / .formField / .formActions / .providerList / .providerItem / .providerInfo / .providerIcon / .providerIconInactive / .providerDetails / .providerNameRow / .providerNameWrapper / .providerName / .activeTag / .usageText / .settingsBtn / .testConnectionRow / .connectionResult / .connectionSuccess / .connectionError / .rowDivider / .footer`) are deleted.
- `apps/extension/src/background/handlers/api-key-handler.ts` — kept. The existing `TEST_CONNECTION`, `DECRYPT_API_KEY`, `SELECT_PROVIDER`, and `GET_CONFIGURED_PROVIDERS` actions are reused as-is. **No new action is added**; selecting a provider uses the existing `SELECT_PROVIDER`. **The `SAVE_PROVIDER` and `DELETE_PROVIDER` actions are not used from the extension settings page any more** but stay in the handler in case any other surface still calls them.
- The list of provider credentials is already transit-encrypted on the wire (the controller's `getApiKeys` re-encrypts the stored-at-rest value with the shared `TRANSIT_SECRET` — see `apps/backend/src/controllers/api-key-controller.ts` lines 169–213). The `DECRYPT_API_KEY` action uses the same `TRANSIT_SECRET` to round-trip back to plaintext. **No backend change is required.**

---

## Phase 0 — Data layer (no UI yet)

These steps add the cache module, the shared `ApiKeyData` (re)use, and the realtime invalidation hook. They are independent of the visible UI, so the rest of the app keeps building while the page is being built.

### Step 0.1 — Verify `PaginatedApiKeysResponse` is exported from the shared types

**File:** `packages/shared-types/src/api-key.ts` and `packages/shared-types/src/index.ts`

- Confirm `PaginatedApiKeysResponse` is exported (it was added in the web settings plan). The extension side will re-use the same shape because the web `useApiKeys` hook reads it and so will our extension cache.
- The shape we need is:
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
- **Why:** the extension list will read pages from the same endpoint (`GET /api/api-key`) and store them in IndexedDB using this exact shape.

### Step 0.2 — Add an `api-keys` cache module

**New file:** `apps/extension/src/db/api-keys-cache.ts`

- Mirror `apps/extension/src/db/personas-cache.ts` and `apps/extension/src/db/jobs-cache.ts`:
  - Export `getApiKeyCacheKey(token, search, page)` returning `` `${token}:api-keys:${search}:${page}` `` (the `api-keys:` prefix prevents key collisions with the other stores when the same token is used).
  - Export `getCachedApiKeysPage(token, search, page)` and `setCachedApiKeysPage(token, search, data)` against a new `apiKeys` object store.
  - Export `clearAllApiKeysCache()`.
  - Export `patchApiKeyInPages(patch: { id: string } & Partial<ApiKeyData>)` that walks every cached page, finds the row with `id === patch.id`, applies the patch to the matching item, and `cursor.update`s the page. This is the realtime invalidation primitive (see Phase 1).
  - Export `removeApiKeyFromAllPages(id: string)` that filters the row out of every cached page (used on `delete`).
  - Export `getCurrentToken` re-use from `./personas-cache` (it already wraps `chrome.storage.session.get([AUTH_STORAGE_KEY])`).
- The page object shape (new type to live next to `CachedPage` in `apps/extension/src/db/common-cache.ts`):
  ```ts
  export interface CachedApiKeysPage {
    id: string; // `${token}:api-keys:${search}:${page}`
    items: ApiKeyData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
  ```
- **Why:** the existing cache pattern is a perfect template; adding a fifth object store is cheaper than inventing a new pattern.

### Step 0.3 — Register the new `apiKeys` store in the IndexedDB schema

**File:** `apps/extension/src/db/common-cache.ts`

- Inside `interface JFPCacheDB`, add:
  ```ts
  apiKeys: {
    key: string;
    value: CachedApiKeysPage;
  }
  ```
- Bump `DB_VERSION` from `6` to `7`.
- In the `upgrade(db)` block, after the existing `if (!db.objectStoreNames.contains('jobs'))` block, add:
  ```ts
  if (!db.objectStoreNames.contains('apiKeys')) {
    db.createObjectStore('apiKeys', { keyPath: 'id' });
  }
  ```
- **Why:** idb requires a new version number when adding a store. The `upgrade` callback is idempotent so a previous-version browser gets the new store on the next open.

### Step 0.4 — Re-export the new module from the db barrel

**File:** `apps/extension/src/db/index.ts`

- Add `export * from './api-keys-cache';` to the existing re-exports.
- **Why:** every consumer imports the cache helpers from `@/db` (or `../db`) — keeps the import surface stable.

### Step 0.5 — Add a `useApiKeysCache` hook

**New file:** `apps/extension/src/hooks/use-api-keys-cache.ts`

- Mirror `apps/extension/src/hooks/use-personas-cache.ts` and `apps/extension/src/hooks/use-resumes-cache.ts`:
  - Hold a `currentToken: string | null` in a `useRef` and lazily initialize it via `getCurrentToken()` (the personas cache already exposes this).
  - `getPage(page, search)`: read `getCachedApiKeysPage(token, search, page)` and return its payload cast to `PaginatedApiKeysResponse | null`.
  - `setPage(data, search)`: call `setCachedApiKeysPage(token, search, data)`.
  - `invalidateCache()`: call `clearAllApiKeysCache()`.
  - `patchInPages(patch)`: forward to `patchApiKeyInPages(patch)` (no token needed for the patch helper — the store is keyed by token+page already).
- **Why:** keeps the component layer free of DB plumbing and matches the existing `usePersonasCache` shape exactly.

---

## Phase 1 — Realtime wiring (one place to change later)

### Step 1.1 — Handle `apiKey` events in the extension realtime handler

**File:** `apps/extension/src/realtime/realtime-handler.ts`

- Extend the `CacheInvalidationDeps` interface with two new optional members:
  ```ts
  patchApiKeysPage: (patch: { id: string } & Partial<ApiKeyData>) => Promise<void>;
  invalidateApiKeys: () => Promise<void>;
  ```
  (Mark them optional so the type still compiles before Phase 0.5 lands; once that lands, the realtime owner will pass them — see Step 1.2.)
- Add a new branch at the end of `applyRealtimeEventToCache` (mirror the existing `event.resource === 'persona'` switch arm):
  ```ts
  if (event.resource === 'apiKey') {
    if (event.action === 'setActive') {
      const newId = event.data && isFullRow(event.data) ? event.data.id : event.id;
      const previousIds = fullRows.map((r) => r.id);
      const ids = Array.from(new Set([newId, ...previousIds])).filter(
        (id): id is string => typeof id === 'string'
      );
      const ops: Promise<void>[] = [deps.invalidateApiKeys?.() ?? Promise.resolve()];
      for (const id of ids) {
        // Active flag toggles between exactly two providers — patch both.
        ops.push(deps.patchApiKeysPage?.({ id, active: id === newId }) ?? Promise.resolve());
      }
      await Promise.all(ops);
      return;
    }
    if (event.action === 'update') {
      const patches: Array<{ id: string } & Partial<ApiKeyData>> = [];
      if (event.data && isFullRow(event.data)) {
        patches.push(event.data as { id: string } & Partial<ApiKeyData>);
      }
      for (const row of fullRows) {
        patches.push(row as { id: string } & Partial<ApiKeyData>);
      }
      await Promise.all(patches.map((p) => deps.patchApiKeysPage?.(p) ?? Promise.resolve()));
      return;
    }
    if (event.action === 'create') {
      // New row is added to the latest page; safest: invalidate and let the UI refetch.
      await (deps.invalidateApiKeys?.() ?? Promise.resolve());
      return;
    }
    if (event.action === 'delete') {
      // Use removeApiKeyFromAllPages for surgical delete; fall back to invalidation.
      await (deps.invalidateApiKeys?.() ?? Promise.resolve());
      return;
    }
  }
  ```
- Import the shared `ApiKeyData` type from `@repo/shared-types` at the top of the file.
- Reuse the existing `isFullRow` and `fullRows` helpers — they already filter for `{ id: string }`.
- **Why:** the backend already emits `apiKey` events from the controller (see `apps/backend/src/controllers/api-key-controller.ts` — `'apiKey', 'create' | 'update' | 'delete' | 'setActive'`). Today the extension ignores them; this wires the cache.

### Step 1.2 — Pass the new deps from the realtime owner

**File:** `apps/extension/src/realtime/realtime-owner.ts`

- Import `patchApiKeyInPages` and `clearAllApiKeysCache` from `../db/api-keys-cache`.
- Add to the `DEPS` object:
  ```ts
  patchApiKeysPage: patchApiKeyInPages,
  invalidateApiKeys: clearAllApiKeysCache,
  ```
- **Why:** `DEPS` is the only place the realtime handler pulls cache primitives from. Adding it here is a one-liner.

### Step 1.3 — Re-broadcast `apiKey` events to the side panel

**File:** `apps/extension/src/realtime/realtime-owner.ts`

- The existing `broadcastToSidePanel` already forwards every `resource.changed` event. **No change required**, but the new `AiProviderCardList` will subscribe to `chrome.runtime.onMessage` and filter on `payload.resource === 'apiKey'` to trigger a refetch (see Phase 2).
- **Why:** documents the contract for the UI subscriber.

---

## Phase 2 — UI components

Each subsection creates the new files for one part of the read-only list. The route file is updated last in Phase 3.

### Step 2.0 — "Open in web app" info banner (mirrors `personas-section.tsx`)

The personas section has an info banner at the top: "To create, edit, or delete personas, please use the web application" with a link to the web app. The settings page is **strictly read-only in the extension**, so we need the same banner pointing at the web app's `/settings` page so the user knows where to go to add/edit/delete providers.

**File to edit:** `apps/extension/src/components/providers-list-section.tsx` (the file created in Step 2.3 below)

**Requirements:**

- At the top of the section, render the same `.infoBanner / .infoText / .infoLink` block used in `apps/extension/src/components/personas-section.tsx` (lines 427–440 of that file). Copy the markup verbatim:
  ```tsx
  <div className={styles.infoBanner}>
    <p className={styles.infoText}>
      To create, edit, or delete AI providers, please use the{' '}
      <a
        href={buildWebDeepLink({ path: '/settings' })}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.infoLink}
      >
        web application <OpenInNewIcon style={{ fontSize: '0.75rem', verticalAlign: 'middle' }} />
      </a>
    </p>
  </div>
  ```
- Import `OpenInNewIcon` from `@mui/icons-material/OpenInNew` and `buildWebDeepLink` from `../utils/build-web-deep-link`.
- The deep link uses the **generic** form `buildWebDeepLink({ path: '/settings' })` (see `apps/extension/src/utils/build-web-deep-link.ts` lines 23–31) — this generates `${VITE_WEB_APP_URL}:${VITE_WEB_APP_PORT}/settings`, which is the exact web route the user wants to land on.
- The banner sits **above** the section header and **above** the search/list area, matching the layout in `personas-section.tsx` (banner → header → search → list).
- The banner lives in the **section component**'s own CSS module, not in the route-level `settings.module.css`. Add the same three rules to `apps/extension/src/components/style/providers-list-section.module.css` (created in Step 2.3). Copy them verbatim from `apps/extension/src/routes/style/personas.module.css` lines 24–49:
  ```css
  .infoBanner {
    background-color: var(--black-800);
    border: 1px solid var(--grey-700);
    border-radius: var(--border-radius);
    margin: 0;
    padding: calc(var(--spacing) * 3) calc(var(--spacing) * 4);
  }
  .infoText {
    color: var(--white-700);
    font-size: 0.8rem;
    line-height: 1.4;
    margin: 0;
  }
  .infoLink {
    color: var(--blue-500);
    text-decoration: none;
  }
  .infoLink:hover {
    text-decoration: underline;
  }
  ```
  (The route-level `settings.module.css` reuses the same outer container padding as the page, so the banner is flush with the page edges, not the inner section padding — the margin reset is intentional.)
- **Why:** the user is in the extension because they want quick visibility, but they cannot add/edit/delete here. Pointing them at the exact web route they need keeps the navigation obvious and consistent with the rest of the extension.

### Step 2.1 — Provider credential row (hidden by default, reveal on click)

**New files:**

- `apps/extension/src/components/provider-credential-row.tsx`
- `apps/extension/src/components/style/provider-credential-row.module.css`

**Component requirements:**

- Props: `{ label: string; value: string }` (the value is the **transit-encrypted** value that came from the backend — never plaintext).
- State: `revealed: boolean`, `decrypted: string | null`, `isDecrypting: boolean`, `error: string | null`.
- Layout: a single row, two-column grid. Left: the `label` (e.g. "API Key", "Organization ID", "Project ID", "Custom URL") in `var(--white-700)`. Right: the value, **monospaced** (`font-family: var(--monospace-font, monospace)` — fall back to plain `monospace` if the variable does not exist; pick whichever is defined in `packages/ui/src/constants/css-constants.css`).
- Masking rule when `!revealed`:
  - If `value.length <= 8`, show a string of `•` characters of the same length.
  - Otherwise show the first 4 characters, the last 4 characters, and `•` in the middle (e.g. `sk-1•••••••••••••••••••••uvWz`). Compute as `` `${value.slice(0, 4)}${'•'.repeat(Math.max(8, value.length - 8))}${value.slice(-4)}` ``.
- Eye icon button (`VisibilityOutlined` from `@mui/icons-material` when hidden, `VisibilityOffOutlined` when revealed) to the right of the value. Clicking it:
  1. If `revealed`, just set `revealed = false`.
  2. If not yet revealed and `decrypted === null`, fire a `chrome.runtime.sendMessage({ action: 'DECRYPT_API_KEY', payload: { encryptedKey: value } }, ...)`; on success store `decrypted` and set `revealed = true`; on failure set `error` (and keep the row closed).
  3. If `decrypted !== null`, just set `revealed = true`.
- "Copy" button to the right of the eye (`ContentCopyOutlined` from `@mui/icons-material`). On click, copy `revealed ? decrypted : value` (we don't copy the encrypted blob — we copy the plaintext when revealed, and the masked representation when not) using `navigator.clipboard.writeText`. Show a snackbar via `useSnackbar()` from `apps/extension/src/hooks/use-snackbar.ts` saying "Copied" with `severity: 'success'`.
- **Why:** the values arrive transit-encrypted. The existing `DECRYPT_API_KEY` background action already does the round-trip — we just drive it. Reusing `useSnackbar` keeps user feedback consistent with the rest of the extension.

### Step 2.2 — Provider card (one row in the list)

**New files:**

- `apps/extension/src/components/provider-card.tsx`
- `apps/extension/src/components/style/provider-card.module.css`

**Component requirements:**

- Props: `{ provider: ApiKeyData; isSettingActive: boolean; onSetActive: (id: string) => void; }`.
- Layout (three sections, mirroring `apps/web/src/components/api-key-card.tsx`):
  - **Radio section** (`radioSection`): a Material `Radio` (`checked={provider.active}`, `disabled={provider.active || isSettingActive}`) wrapped in `EnhancedTooltipWithText` with description `provider.active ? 'Active' : 'Click to set as active'` (copy the exact tooltip string from `apps/web/src/components/api-key-card.tsx`). Color the checked radio with `var(--blue-500)`. On change (only fires when not active and not pending), call `onSetActive(provider.id)`.
  - **Data section** (`dataSection`):
    - **Provider header** (existing `providerIcon` + `providerName` from `apps/extension/src/routes/style/settings.module.css`).
    - **Model line** in `color: var(--white-700); font-size: 0.75rem`.
    - **Credentials block**: render one `<ProviderCredentialRow />` per entry in `provider.credentials` (do **not** skip `apiKey` — it must be shown, not deleted). Render `customUrl` under the label "API Base URL", `organizationId` under "Organization ID", `projectId` under "Project ID", and any other key with its original key as the label (the backend stores it in `keyData.credentials`).
  - **No actions section.** Edit/delete buttons are removed (per the requirements: no create/edit/delete in the extension).
- Top-of-file comment: "Provider card — read-only display of one configured AI provider. Includes a radio for setActive and a credentials block that reveals each value on demand via DECRYPT_API_KEY."
- **Why:** the requirements call out "show the card along with the credentials in hidden way and on clicking a button it should be shown like password" — that's exactly the credential row pattern. The radio replaces the green ACTIVE chip so the row matches the web UX.

### Step 2.3 — Providers list section (read-only, paginated, IDB-cached)

**New file:** `apps/extension/src/components/providers-list-section.tsx`

- Mirror `apps/extension/src/components/personas-section.tsx` end-to-end. Concretely:
  - Copy the `PaginationState` / `PaginationAction` / `paginationReducer` types, swap `personas` for `apiKeys` and `Persona` for `ApiKeyData`. Keep `MAX_PAGES = 10` and the `pageSizes` eviction logic identical.
  - `limit = 10`, `searchQuery` local state, `useApiKeysCache` hook.
  - `fetchApiKeys(pageNum, search, direction)`:
    1. Capture the first visible card's id + offset before `fetchPrevious` (same `data-provider-id` selector pattern).
    2. `dispatch({ type: 'FETCH_START', direction })`.
    3. Try `getPage(pageNum, search)`. On hit, dispatch `FETCH_SUCCESS` and return.
    4. On miss, send `chrome.runtime.sendMessage({ action: 'GET_CONFIGURED_PROVIDERS', payload: { page: pageNum, limit, search: search || '' } }, ...)`. On success:
       - The backend returns the page payload at `res.data` (verify with the existing controller — `GET /api/api-key` returns `{ items, page, limit, total, totalPages, hasNextPage, hasPrevPage }`).
       - Call `setPage(res.data, search)`.
       - Dispatch `FETCH_SUCCESS`.
         On failure: dispatch `FETCH_ERROR`.
  - **Note:** the existing handler in `apps/extension/src/background/handlers/api-key-handler.ts` for `GET_CONFIGURED_PROVIDERS` does **not** currently read `page`/`limit`/`search` from the payload — it just calls `api.get('/api-key')`. **Step 2.4 extends the handler to read those params.**
  - IntersectionObserver for top/bottom sentinels (identical to `personas-section.tsx`).
  - `handleSetActive(id)`:
    1. Optimistically dispatch `SET_ACTIVE` so the radio flips immediately.
    2. Send `chrome.runtime.sendMessage({ action: 'SELECT_PROVIDER', payload: { id } }, ...)`.
    3. On success: also `patchApiKeyInPages({ id, active: true })` for every previously-active id (`prevActiveId`) the reducer can derive from the current state — but the simplest correct behavior is to call `invalidateCache()` so the next scroll refetches. The realtime event will arrive within ~100ms and `applyRealtimeEventToCache` will patch the pages in place. **Do not call `invalidateCache()` here** — let the realtime event do the work; otherwise the UI will flash.
    4. On failure: dispatch `SET_ACTIVE` again with the **previous** active id (or revert the whole list) and show a snackbar `"Failed to update active provider"` via `useSnackbar()`.
  - `useEffect` listening to `chrome.runtime.onMessage`:
    ```ts
    if (message.action !== 'RESOURCE_CHANGED') return;
    const payload = message.payload;
    if (!payload || payload.resource !== 'apiKey') return;
    dispatch({ type: 'RESET' });
    fetchApiKeys(1, searchQuery);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    ```
    This guarantees the list reflects any change that happened on another device/session.
- Render structure (mirror `personas-section.tsx`):
  - **Info banner** (defined in Step 2.0) — sits at the very top, above the header.
  - Section header `<span className={styles.sectionHeading}>AI PROVIDERS</span>` (re-use the class from `apps/extension/src/routes/style/settings.module.css`).
  - Search bar — use `EnhancedTextField` with `placeholder="Search providers..."`. **No debounce** here is fine (the existing personas list does not debounce either).
  - Loading: centered `<CircularProgress size={32} sx={{ color: 'var(--blue-500)' }} />`.
  - Error: an error container with retry button (mirror `personas.module.css .errorContainer / .errorText` and `recent-jobs.module.css`).
  - Empty state: `"No providers configured."` in `var(--white-700)`.
  - List: a scroll container with the top + bottom sentinels, mapping over `state.apiKeys` to render `<ProviderCard provider={p} isSettingActive={...} onSetActive={handleSetActive} />` wrapped in a `<div data-provider-id={p.id}>`.
- Top-of-file comment: "Providers list section — read-only, paginated, IndexedDB-cached list of configured AI providers. The active provider is chosen via a Material Radio per row. Subscribes to RESOURCE_CHANGED events to stay in sync with the backend."
- **Why:** the section is functionally identical to `personas-section.tsx` and `resume-section.tsx` — we copy the pattern and only swap the message action + the data type.

### Step 2.4 — Extend the `GET_CONFIGURED_PROVIDERS` handler to accept pagination

**File:** `apps/extension/src/background/handlers/api-key-handler.ts`

- Replace the existing branch:
  ```ts
  if (message.action === 'GET_CONFIGURED_PROVIDERS') {
    api
      .get<ApiResponse<ApiKeyData[]>>('/api-key')
      .then(...)
  }
  ```
  with:
  ```ts
  if (message.action === 'GET_CONFIGURED_PROVIDERS') {
    const payload = message.payload ?? {};
    const { page, limit, search } = payload as {
      page?: number;
      limit?: number;
      search?: string;
    };
    const params: Record<string, string | number> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    if (search !== undefined && search !== '') params.search = search;
    api
      .get<ApiResponse<PaginatedApiKeysResponse>>('/api-key', { params })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('GET_CONFIGURED_PROVIDERS error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Failed to fetch providers',
        });
      });
    return true;
  }
  ```
- Import `PaginatedApiKeysResponse` from `@repo/shared-types` at the top.
- **Why:** the web hook already calls this endpoint with `page / limit / search`; the extension handler has been ignoring them.

### Step 2.5 — Declare the new payload on the message union

**File:** `packages/shared-types/src/messages.ts`

- Change the `GET_CONFIGURED_PROVIDERS` arm from
  ```ts
  | { action: 'GET_CONFIGURED_PROVIDERS' }
  ```
  to
  ```ts
  | {
      action: 'GET_CONFIGURED_PROVIDERS';
      payload?: { page?: number; limit?: number; search?: string };
    }
  ```
- **Why:** the new component passes a payload; the discriminated union must allow it.

---

## Phase 3 — Route wiring

### Step 3.1 — Replace the providers section import in the settings route

**File:** `apps/extension/src/routes/settings.tsx`

- Remove the import of `AiProvidersSection` from `../components/ai-providers-section`.
- Add `import { ProvidersListSection } from '../components/providers-list-section';`.
- Replace `<AiProvidersSection />` with `<ProvidersListSection />` in the JSX.
- **Do not** add a delete-account section (per the task: "not the delete account — it will stay in the web only").
- Top-of-file comment: unchanged (the route is still the settings route; the comment is about the page, not the providers section).
- **Why:** the route file is the smallest change; everything new lives in the components directory.

### Step 3.2 — Clean up the obsolete wizard/list styles

**File:** `apps/extension/src/routes/style/settings.module.css`

- Keep the route-chrome rules used by the current settings page (`.container`, `.header`, `.backBtn`, `.headerTitle`, `.aiStatusArea`, `.aiStatusCard`, `.aiStatusLabels`, `.aiStatusTitle`, `.aiStatusValue`, `.section`, `.sectionHeader`, `.sectionTitle`, `.sectionHeading`).
- Delete the wizard-specific rules: `.addProviderForm`, `.formField`, `.formActions`, `.providerList`, `.providerItem`, `.providerItem:hover`, `.selectedProviderItem`, `.providerItemDisabled`, `.providerInfo`, `.providerIcon`, `.providerIconInactive`, `.providerDetails`, `.providerNameRow`, `.providerNameWrapper`, `.providerName`, `.activeTag`, `.usageText`, `.settingsBtn`, `.settingsBtn:hover`, `.testConnectionRow`, `.connectionResult`, `.connectionSuccess`, `.connectionError`, `.rowDivider`, `.footer`.
- **Why:** per `.clinerules`, every component owns its card styling in its own `*.module.css`. The wizard and old list cards are gone; the shared styles are gone with them.
- The new `provider-card.module.css` re-declares any layout rules it needs (`.providerCard`, `.radioSection`, `.dataSection`, `.providerIcon`, `.providerName`, etc.) using the same CSS variables. Copy the values verbatim from the deleted rules so the new card looks identical to the old one, with two exceptions:
  - `.activeTag` is removed (the active state is shown via the checked radio).
  - Add a new `.credentialsBlock` rule (`display: flex; flex-direction: column; gap: calc(var(--spacing) * 1); margin-top: calc(var(--spacing) * 2);`) to host the credential rows.

### Step 3.3 — Delete the wizard and old list components

**Files to delete:**

- `apps/extension/src/components/ai-providers-section.tsx`
- `apps/extension/src/components/configured-providers.tsx`

- **Why:** both are replaced by `providers-list-section.tsx` + `provider-card.tsx` + `provider-credential-row.tsx`. Keeping the old files risks them being imported by mistake.

---

## Phase 4 — Polish & contracts

### Step 4.1 — Empty / loading / error states on the list

- Verify all three states render with the right copy and styling:
  - Loading: `<CircularProgress size={32} sx={{ color: 'var(--blue-500)' }} />` in a centered container.
  - Error: a `red-600` bordered card with the error message and a Retry button (mirror `personas-section.tsx` lines 476–482).
  - Empty: `"No providers configured."` in `var(--white-700)`, font-size `0.875rem`, centered.
  - Empty after search: `"No providers match your search."` (mirroring `personas-section.tsx` line 489).
- **Why:** the personas list establishes this contract; reusing it keeps the side panel consistent.

### Step 4.2 — Verify all colors and sizes come from CSS variables

- Open every new `*.module.css` file (`provider-credential-row.module.css`, `provider-card.module.css`) and confirm there are no literal hex colors, pixel font sizes, or magic spacing values. Every one of them must map to a variable defined in `packages/ui/src/constants/css-constants.css` (or `calc(var(--spacing) * N)`).
- **Why:** `.clinerules` mandates `css-constants.css` for colors and font sizes.

### Step 4.3 — Verify no inline CSS

- `grep -R "style={" apps/extension/src/components/provider-card.tsx apps/extension/src/components/provider-credential-row.tsx apps/extension/src/components/providers-list-section.tsx apps/extension/src/routes/settings.tsx` should return nothing.
- The only legitimate `style=` usage left in the extension is in `configured-providers.tsx` (which is being deleted) and the inline `borderColor` on the `Delete` icon — also being deleted.
- **Why:** `.clinerules` forbids inline CSS.

### Step 4.4 — Verify shared types are imported (not redeclared)

- After implementing, no new types are introduced into the extension beyond the locally-scoped `CachedApiKeysPage` interface (which lives in `db/common-cache.ts` alongside `CachedPage`, `CachedResumePage`, `CachedVersionPage`, `CachedJobsPage`). `ApiKeyData` and `PaginatedApiKeysResponse` are imported from `@repo/shared-types`.
- **Why:** the dashboard plan's Phase 6 contract.

### Step 4.5 — Smoke test

1. Sign in as a fresh user (no API keys yet). Open the side panel and navigate to `/settings`. Expect: account-detail card shows email; providers section says "No providers configured."
2. In the web app, add a Gemini provider. Wait a few seconds. Expect: the extension list refetches and shows one row, with the radio checked (active) and disabled.
3. Click the eye icon next to the `apiKey` row. Expect: the value is fetched via `DECRYPT_API_KEY` and rendered as plaintext. Click again — it hides. Click the copy icon — a snackbar says "Copied".
4. In the web app, add an OpenAI provider. Expect: a new row appears in the extension list (via the `RESOURCE_CHANGED` `apiKey:create` event). The first row is still active, the new one is not.
5. In the extension, click the radio on the new row. Expect: it becomes active (optimistically), then the backend confirms via `RESOURCE_CHANGED` `apiKey:setActive`. The first row's radio goes off.
6. Search for `openai` in the extension. Expect: only the second row remains. Clear the search — both rows return.
7. Scroll down on a long list to confirm the pagination works (only the first 10 rows are loaded; bottom sentinel triggers a `GET_CONFIGURED_PROVIDERS` for `page=2`).
8. Delete a provider in the web app. Expect: the extension list refetches and the row is gone.
9. Confirm the **Delete Account** section is **not** present in the extension.
10. Confirm the **Add New** button is **not** present in the extension, and no edit/delete icons are present on any card.
11. Confirm the **info banner** is visible at the top of the providers section, reads "To create, edit, or delete AI providers, please use the **web application**" and the link opens `${VITE_WEB_APP_URL}:${VITE_WEB_APP_PORT}/settings` in a new tab when clicked.

---

## What is **not** in this plan

- No backend changes — the controller already emits `apiKey` events and returns transit-encrypted credentials. The extension just reads them.
- No new AI provider logic — `apps/backend/src/services/ai-key-service.ts` and the AI registry are reused as-is.
- No new auth / realtime schema changes — `event.resource === 'apiKey'` is already in the validator from the dashboard plan's Phase 1, and the `RealtimeClient` already exists.
- No extension-side encryption / decryption helpers — the `DECRYPT_API_KEY` background action already wraps `transitDecrypt` with the shared `TRANSIT_SECRET`.
- No delete-account work in the extension.

---

## How another LLM should pick this up

1. Read the top of this file (the **Conventions** section) once and treat it as a style contract for every step below.
2. Walk the phases in order: **0 (data) → 1 (realtime) → 2 (UI) → 3 (route) → 4 (polish)**.
3. Inside each phase, follow the step numbers; each step is small enough to be implemented and PR'd on its own.
4. After each phase, the dev server should still build and the existing pages should still work — the settings feature is purely additive until Phase 3 wires the route.
5. If a referenced file does not exist, open the closest sibling — `apps/extension/src/components/personas-section.tsx`, `apps/extension/src/components/resume-section.tsx`, and `apps/web/src/components/api-key-card.tsx` are the canonical templates.

---

## Reference files (read these first)

- `apps/extension/src/components/personas-section.tsx` — pagination + sentinel + realtime pattern to mirror.
- `apps/extension/src/components/resume-section.tsx` — same pattern; another good reference.
- `apps/extension/src/db/personas-cache.ts` — IDB cache module to mirror.
- `apps/extension/src/hooks/use-personas-cache.ts` — cache hook to mirror.
- `apps/extension/src/realtime/realtime-handler.ts` — add a new `apiKey` branch.
- `apps/extension/src/realtime/realtime-owner.ts` — register the new deps.
- `apps/web/src/components/api-key-card.tsx` — radio + tooltip + active flag UX to mirror (minus the edit/delete buttons).
- `apps/web/src/components/api-configuration-section.tsx` — list layout, search bar, infinite-scroll container.
- `apps/extension/src/background/handlers/api-key-handler.ts` — extend the `GET_CONFIGURED_PROVIDERS` arm; reuse `SELECT_PROVIDER` and `DECRYPT_API_KEY`.
- `packages/ui/src/constants/css-constants.css` — every CSS variable name used in this plan.
- `docs/settings.md` — the sibling web plan this file mirrors in style and phase structure.
