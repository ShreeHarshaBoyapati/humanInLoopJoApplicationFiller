# Extension settings page — execution checklist

This is the companion to `docs/extension-settings.md`. The plan file describes the **why** and the high-level **what**. This file breaks every phase into atomic, ordered sub-steps with explicit **checkpoints** you can run between sub-steps so a broken change is caught at the smallest possible diff.

Read the plan first, then come back here and walk top-to-bottom. Every checkpoint is a terminal command (or a `git diff` + browser smoke test) the user runs themselves — per the project rules, `execute_command` is not used by the agent for this work.

> **Phases map 1:1 to the plan.**
>
> - **Phase 0** — data layer (IDB cache, hook, type re-exports).
> - **Phase 1** — realtime wiring (handler branch + deps).
> - **Phase 2** — UI components (banner, credential row, card, list section, message union, background handler).
> - **Phase 3** — route wiring (swap import, clean up styles, delete old components).
> - **Phase 4** — polish & smoke tests.

A checkpoint is "passed" when its command exits `0` (or, for the smoke tests, when the described UI state matches). Do not advance past a failing checkpoint.

---

## Conventions (mirror from plan)

- All new component files live in `apps/extension/src/components/`, paired with `apps/extension/src/components/style/<file>.module.css`.
- Cache modules live in `apps/extension/src/db/`, hooks in `apps/extension/src/hooks/`.
- Shared types are imported from `@repo/shared-types`; only locally-scoped DB types live in `apps/extension/src/db/common-cache.ts`.
- No inline CSS. All colors / font sizes / spacing come from `packages/ui/src/constants/css-constants.css`.
- Top-of-file comment on every new component (purpose + features).
- Canonical templates to copy:
  - `apps/extension/src/components/personas-section.tsx` (pagination + sentinel + realtime)
  - `apps/extension/src/components/resume-section.tsx` (sibling pattern)
  - `apps/extension/src/db/personas-cache.ts` (cache module)
  - `apps/extension/src/hooks/use-personas-cache.ts` (cache hook)
  - `apps/web/src/components/api-key-card.tsx` (radio + tooltip + active UX)

---

## Phase 0 — Data layer

### Sub-step 0.1.a — Confirm `PaginatedApiKeysResponse` is exported

**Action**

- Open `packages/shared-types/src/api-key.ts` and `packages/shared-types/src/index.ts`.
- Confirm `PaginatedApiKeysResponse` is exported from both (added in the web settings plan).

**Checkpoint**

```bash
grep -n "PaginatedApiKeysResponse" packages/shared-types/src/api-key.ts packages/shared-types/src/index.ts
```

Expected: at least one hit in each file, and the interface body lists `items / page / limit / total / totalPages / hasNextPage / hasPrevPage`.

**If missing:** the web settings plan was not merged yet — stop and resolve there before continuing.

---

### Sub-step 0.2.a — Create `CachedApiKeysPage` in common-cache

**Action**

- Edit `apps/extension/src/db/common-cache.ts`.
- Add a new exported interface next to `CachedPage`:
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
- Import `ApiKeyData` at the top: `import type { ApiKeyData } from '@repo/shared-types';`.

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 0.2.b — Create `apps/extension/src/db/api-keys-cache.ts`

**Action**

- New file. Mirror `apps/extension/src/db/personas-cache.ts` end-to-end, but:
  - Cache key prefix is `api-keys:` (not `personas:`).
  - Object store is `apiKeys` (not `personas`).
  - Page type is `CachedApiKeysPage` (not `CachedPage`).
  - Helpers to export: `getApiKeyCacheKey`, `getCachedApiKeysPage`, `setCachedApiKeysPage`, `clearAllApiKeysCache`, `patchApiKeyInPages`, `removeApiKeyFromAllPages`.
  - `patchApiKeyInPages` walks every record, applies `Object.assign(item, patch)` where `item.id === patch.id`, then `cursor.update(newValue)`.
  - `removeApiKeyFromAllPages` does the same but filters the row out and rewrites `total` (decrement by 1 if removed).
- Re-export `getCurrentToken` from `./personas-cache`.

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 0.3.a — Register the `apiKeys` store in the schema

**Action**

- In `apps/extension/src/db/common-cache.ts`:
  - Add `apiKeys: { key: string; value: CachedApiKeysPage };` to the `JFPCacheDB` interface.
  - Bump `DB_VERSION` from `6` to `7`.
  - In the `upgrade(db)` callback, after the existing `if (!db.objectStoreNames.contains('jobs'))` block, add:
    ```ts
    if (!db.objectStoreNames.contains('apiKeys')) {
      db.createObjectStore('apiKeys', { keyPath: 'id' });
    }
    ```

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

> **Why a version bump:** IndexedDB requires a higher version to add a new object store. The `upgrade` callback is idempotent, so users on the old version get the new store on next open without manual migration.

---

### Sub-step 0.4.a — Re-export the new cache from the db barrel

**Action**

- In `apps/extension/src/db/index.ts`, add `export * from './api-keys-cache';` (keep alphabetical ordering with the other exports if the file uses it).

**Checkpoint**

```bash
grep -n "api-keys-cache" apps/extension/src/db/index.ts
pnpm --filter extension check-types
```

Expected: at least one hit in `index.ts`; `check-types` exits `0`.

---

### Sub-step 0.5.a — Create the `useApiKeysCache` hook

**Action**

- New file `apps/extension/src/hooks/use-api-keys-cache.ts`.
- Mirror `apps/extension/src/hooks/use-personas-cache.ts`:
  - `useRef<string | null>(null)` for `currentToken`, lazily initialized via `getCurrentToken()`.
  - `getPage(page, search)` → `PaginatedApiKeysResponse | null` (cast from `CachedApiKeysPage`).
  - `setPage(data, search)` → forward to `setCachedApiKeysPage`.
  - `invalidateCache()` → `clearAllApiKeysCache`.
  - `patchInPages(patch)` → `patchApiKeyInPages(patch)`.

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Phase 0 final checkpoint

```bash
pnpm lint
pnpm check-types
```

Expected: both exit `0`. The app should still build and run unchanged — nothing is wired to UI yet.

---

## Phase 1 — Realtime wiring

### Sub-step 1.1.a — Extend `CacheInvalidationDeps`

**Action**

- Edit `apps/extension/src/realtime/realtime-handler.ts`.
- Import `ApiKeyData` from `@repo/shared-types`.
- Add to `CacheInvalidationDeps`:
  ```ts
  patchApiKeysPage?: (patch: { id: string } & Partial<ApiKeyData>) => Promise<void>;
  invalidateApiKeys?: () => Promise<void>;
  ```
  (Optional so the file still compiles if Phase 1.2 lands later.)

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 1.1.b — Add the `apiKey` branch to `applyRealtimeEventToCache`

**Action**

- In the same file, add a new `if (event.resource === 'apiKey') { ... }` arm at the end of `applyRealtimeEventToCache`.
- Handle four actions (verbatim from plan):
  - `setActive`: collect `newId` + all `previousIds`, dispatch one `invalidateApiKeys` + one `patchApiKeysPage({ id, active: id === newId })` per id.
  - `update`: collect `event.data` (if full row) + all `fullRows`, patch each.
  - `create`: just `invalidateApiKeys()` — the new row belongs on the latest page; safest to refetch.
  - `delete`: `invalidateApiKeys()` — the realtime primitive `removeApiKeyFromAllPages` is available but `invalidateApiKeys` is the simplest correct fallback for now.

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 1.2.a — Pass the new deps from the realtime owner

**Action**

- In `apps/extension/src/realtime/realtime-owner.ts`:
  - Add `import { patchApiKeyInPages, clearAllApiKeysCache } from '../db/api-keys-cache';`.
  - Add to the `DEPS` object:
    ```ts
    patchApiKeysPage: patchApiKeyInPages,
    invalidateApiKeys: clearAllApiKeysCache,
    ```

**Checkpoint**

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 1.3.a — Confirm `broadcastToSidePanel` already forwards `apiKey` events

**Action**

- Read `apps/extension/src/realtime/realtime-owner.ts`.
- Confirm the existing `broadcastToSidePanel` call passes every `resource.changed` event to the side panel (no filtering by `resource`).

**Checkpoint**

```bash
grep -n "broadcastToSidePanel\|RESOURCE_CHANGED\|resource.changed" apps/extension/src/realtime/realtime-owner.ts
```

Expected: at least one hit per term; the call site does not filter on resource.

**If filtered:** this plan assumes the side panel receives every event. Stop and reconcile with the existing broadcaster before Phase 2.

---

### Phase 1 final checkpoint

```bash
pnpm lint
pnpm check-types
```

Expected: both exit `0`. Open the extension, open DevTools on the side panel, run `chrome.runtime.sendMessage` from a console to trigger an `apiKey:update` (or use the web app to create a key while the extension is open) and verify in the **Application → IndexedDB → JFPCacheDB → apiKeys** store that a page row appears (or that the store is created empty — Phase 0 already created it; Phase 2 will start writing to it).

---

## Phase 2 — UI components

### Sub-step 2.0.a — Create the providers-list-section styles file (banner rules)

**Action**

- New file `apps/extension/src/components/style/providers-list-section.module.css`.
- Copy `.infoBanner / .infoText / .infoLink / .infoLink:hover` rules verbatim from `apps/extension/src/routes/style/personas.module.css` lines 24–49.
- Add an empty placeholder rule for `.section` and `.sectionHeading` to be filled in by Step 2.3 (or do not add yet — Step 2.3 will add them).

**Checkpoint**

```bash
pnpm lint:css
```

Expected: exits `0`. No `var(--black-800)` etc. literal hexes.

---

### Sub-step 2.1.a — Create `provider-credential-row.module.css`

**Action**

- New file `apps/extension/src/components/style/provider-credential-row.module.css`.
- Rules to include (all values via CSS variables from `css-constants.css`):
  - `.row` — `display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto auto; gap: calc(var(--spacing) * 2); align-items: center;`
  - `.label` — `color: var(--white-700); font-size: 0.75rem;`
  - `.value` — `color: var(--white-900); font-family: var(--monospace-font, monospace); font-size: 0.75rem; overflow-wrap: anywhere;`
  - `.iconBtn` — `color: var(--grey-500); padding: calc(var(--spacing) * 1);`
  - `.iconBtn:hover` — `color: var(--blue-500);`
  - `.error` — `color: var(--red-600); font-size: 0.7rem;`

**Checkpoint**

```bash
pnpm lint:css
```

Expected: exits `0`. Confirm `grep -nE "#[0-9a-fA-F]{3,6}" provider-credential-row.module.css` returns nothing.

---

### Sub-step 2.1.b — Create `provider-credential-row.tsx`

**Action**

- New file `apps/extension/src/components/provider-credential-row.tsx`.
- Top-of-file comment: "Provider credential row — displays one transit-encrypted credential with reveal-on-click and copy-to-clipboard. Decryption is delegated to the DECRYPT_API_KEY background action."
- Props: `{ label: string; value: string }`.
- State: `revealed`, `decrypted`, `isDecrypting`, `error`.
- Masking logic (verbatim from plan).
- Eye icon: `VisibilityOutlined` ↔ `VisibilityOffOutlined`.
- Copy icon: `ContentCopyOutlined`. Snackbar via `useSnackbar()` from `apps/extension/src/hooks/use-snackbar.ts`.
- DECRYPT message: `chrome.runtime.sendMessage({ action: 'DECRYPT_API_KEY', payload: { encryptedKey: value } }, cb)`. The current response shape: `{ success: true, data: '<plaintext>' }` or `{ success: false, error }`. Verify by reading `apps/extension/src/background/handlers/api-key-handler.ts` before wiring.

**Checkpoint**

```bash
pnpm --filter extension check-types
pnpm lint
```

Expected: both exit `0`.

---

### Sub-step 2.2.a — Create `provider-card.module.css`

**Action**

- New file `apps/extension/src/components/style/provider-card.module.css`.
- Rules (all values via variables):
  - `.providerCard` — container card.
  - `.radioSection` — left padding so the radio hugs the card edge.
  - `.dataSection` — `display: flex; flex-direction: column; gap: calc(var(--spacing) * 1);`
  - `.providerIcon` / `.providerName` — copied from the deleted rules in `settings.module.css` (see Step 3.2).
  - `.modelLine` — `color: var(--white-700); font-size: 0.75rem;`
  - `.credentialsBlock` — `display: flex; flex-direction: column; gap: calc(var(--spacing) * 1); margin-top: calc(var(--spacing) * 2);`
- Copy values verbatim from the existing `apps/extension/src/routes/style/settings.module.css` so the new card looks identical to the old one (minus the active tag).

**Checkpoint**

```bash
pnpm lint:css
```

Expected: exits `0`. `grep -nE "#[0-9a-fA-F]{3,6}" provider-card.module.css` returns nothing.

---

### Sub-step 2.2.b — Create `provider-card.tsx`

**Action**

- New file `apps/extension/src/components/provider-card.tsx`.
- Top-of-file comment: "Provider card — read-only display of one configured AI provider. Includes a radio for setActive and a credentials block that reveals each value on demand via DECRYPT_API_KEY."
- Props: `{ provider: ApiKeyData; isSettingActive: boolean; onSetActive: (id: string) => void; }`.
- Imports: `Radio` from `@mui/material`, `EnhancedTooltipWithText` from `@repo/ui`, `EnhancedButton` from `@repo/ui`.
- Radio colors: `sx={{ color: 'var(--grey-500)', '&.Mui-checked': { color: 'var(--blue-500)' } }}` (MUI requires the sx for checked color).
- Render credentials: `apiKey → "API Key"`, `customUrl → "API Base URL"`, `organizationId → "Organization ID"`, `projectId → "Project ID"`, anything else → `key` as-is.

**Checkpoint**

```bash
pnpm --filter extension check-types
pnpm lint
```

Expected: both exit `0`.

---

### Sub-step 2.3.a — Create `providers-list-section.module.css`

**Action**

- New file `apps/extension/src/components/style/providers-list-section.module.css`.
- Copy section chrome from `apps/extension/src/routes/style/settings.module.css` `.section / .sectionHeader / .sectionTitle / .sectionHeading` and paste them into the new module (the route module stops exporting them in Step 3.2).
- Add `.searchBar` wrapper for the `EnhancedTextField`.
- Add `.scrollContainer`, `.sentinel` for the IntersectionObserver.
- Add `.loadingContainer`, `.errorContainer`, `.errorText`, `.errorRetryBtn`, `.emptyState` mirroring `personas-section.tsx`.

**Checkpoint**

```bash
pnpm lint:css
```

Expected: exits `0`.

---

### Sub-step 2.3.b — Create `providers-list-section.tsx`

**Action**

- New file `apps/extension/src/components/providers-list-section.tsx`.
- Top-of-file comment: "Providers list section — read-only, paginated, IndexedDB-cached list of configured AI providers. The active provider is chosen via a Material Radio per row. Subscribes to RESOURCE_CHANGED events to stay in sync with the backend."
- Imports: `useApiKeysCache`, `PaginatedApiKeysResponse`, `ApiKeyData` from `@repo/shared-types`, `useSnackbar`, `ProviderCard`, `EnhancedTextField`, `EnhancedButton`, `CircularProgress`, `OpenInNewIcon`, `buildWebDeepLink`.
- Mirror `personas-section.tsx` end-to-end (pagination reducer with `MAX_PAGES = 10`, `limit = 10`, `pageSizes` eviction, IntersectionObserver).
- `fetchApiKeys(pageNum, search, direction)`:
  1. Save first-visible-card id + offset (`data-provider-id` selector).
  2. `dispatch({ type: 'FETCH_START', direction })`.
  3. Cache hit → dispatch `FETCH_SUCCESS`, return.
  4. Cache miss → `chrome.runtime.sendMessage({ action: 'GET_CONFIGURED_PROVIDERS', payload: { page: pageNum, limit, search: search || '' } }, cb)`. On success, `setPage(res.data, search)` + `dispatch FETCH_SUCCESS`.
- `handleSetActive(id)`:
  1. Optimistic `dispatch({ type: 'SET_ACTIVE', id })`.
  2. `chrome.runtime.sendMessage({ action: 'SELECT_PROVIDER', payload: { id } }, cb)`.
  3. On success: do **not** call `invalidateCache()` — wait for the realtime event.
  4. On failure: revert with another `SET_ACTIVE` to the previous id, show snackbar `"Failed to update active provider"`.
- `useEffect` on `chrome.runtime.onMessage`:
  ```ts
  if (message.action !== 'RESOURCE_CHANGED') return;
  const payload = message.payload;
  if (!payload || payload.resource !== 'apiKey') return;
  dispatch({ type: 'RESET' });
  fetchApiKeys(1, searchQuery);
  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  ```
- Render structure: **info banner → section header (`AI PROVIDERS`) → search bar → list → sentinels → states**.

**Checkpoint**

```bash
pnpm --filter extension check-types
pnpm lint
```

Expected: both exit `0`.

> **Do not import `providers-list-section` from the route yet.** Phase 3 wires the route.

---

### Sub-step 2.4.a — Extend `GET_CONFIGURED_PROVIDERS` handler

**Action**

- Edit `apps/extension/src/background/handlers/api-key-handler.ts`.
- Import `PaginatedApiKeysResponse` from `@repo/shared-types`.
- Replace the existing branch with the paginated variant from the plan (read `page / limit / search` from `message.payload`, build `params`, call `api.get<ApiResponse<PaginatedApiKeysResponse>>('/api-key', { params })`).
- Confirm `return true;` is the last statement in the branch so `sendResponse` stays valid for the async path.

**Checkpoint**

```bash
pnpm --filter extension check-types
pnpm lint
```

Expected: both exit `0`.

> **Manual verify:** with the backend running and the extension dev build loaded, call `chrome.runtime.sendMessage({ action: 'GET_CONFIGURED_PROVIDERS', payload: { page: 1, limit: 5, search: '' } })` from the side-panel console. Expect a `{ success: true, data: { items, page, limit, total, totalPages, hasNextPage, hasPrevPage } }` shape.

---

### Sub-step 2.5.a — Update the `GET_CONFIGURED_PROVIDERS` message union

**Action**

- Edit `packages/shared-types/src/messages.ts`.
- Change the arm to:
  ```ts
  | {
      action: 'GET_CONFIGURED_PROVIDERS';
      payload?: { page?: number; limit?: number; search?: string };
    }
  ```

**Checkpoint**

```bash
pnpm check-types
```

Expected: exits `0`. Every workspace compiles because the change is additive.

---

### Phase 2 final checkpoint

```bash
pnpm lint
pnpm check-types
pnpm --filter extension build
```

Expected: all exit `0`. The extension **still does not render** the new section (the route import is unchanged until Phase 3), but the code is built and type-clean.

---

## Phase 3 — Route wiring

### Sub-step 3.1.a — Swap the import in `routes/settings.tsx`

**Action**

- Edit `apps/extension/src/routes/settings.tsx`:
  - Remove `import { AiProvidersSection } from '../components/ai-providers-section';`.
  - Add `import { ProvidersListSection } from '../components/providers-list-section';`.
  - Replace `<AiProvidersSection />` with `<ProvidersListSection />`.
- Confirm there is **no** `DeleteAccountSection` import or JSX node (per the plan, it stays web-only).

**Checkpoint**

```bash
grep -n "AiProvidersSection\|ProvidersListSection\|DeleteAccountSection" apps/extension/src/routes/settings.tsx
```

Expected: only `ProvidersListSection` appears. No `AiProvidersSection`, no `DeleteAccountSection`.

```bash
pnpm --filter extension check-types
```

Expected: exits `0`.

---

### Sub-step 3.2.a — Clean up `settings.module.css`

**Action**

- Edit `apps/extension/src/routes/style/settings.module.css`.
- **Keep:** `.container, .header, .backBtn, .headerTitle, .aiStatusArea, .aiStatusCard, .aiStatusLabels, .aiStatusTitle, .aiStatusValue, .section, .sectionHeader, .sectionTitle, .sectionHeading`.
- **Delete:** `.addProviderForm, .formField, .formActions, .providerList, .providerItem, .providerItem:hover, .selectedProviderItem, .providerItemDisabled, .providerInfo, .providerIcon, .providerIconInactive, .providerDetails, .providerNameRow, .providerNameWrapper, .providerName, .activeTag, .usageText, .settingsBtn, .settingsBtn:hover, .testConnectionRow, .connectionResult, .connectionSuccess, .connectionError, .rowDivider, .footer`.
- **Note:** `.providerIcon, .providerName` are re-declared in `provider-card.module.css` (Step 2.2.a) so the new card looks identical.

**Checkpoint**

```bash
pnpm lint:css
grep -n "activeTag\|addProviderForm\|providerList" apps/extension/src/routes/style/settings.module.css
```

Expected: `lint:css` exits `0`; the `grep` returns nothing.

---

### Sub-step 3.3.a — Delete the obsolete components

**Action**

- Delete `apps/extension/src/components/ai-providers-section.tsx`.
- Delete `apps/extension/src/components/configured-providers.tsx`.

**Checkpoint**

```bash
ls apps/extension/src/components/ | grep -E "ai-providers-section|configured-providers"
grep -RnE "ai-providers-section|configured-providers" apps/extension/src
```

Expected: both commands return nothing.

```bash
pnpm lint
pnpm check-types
```

Expected: both exit `0`.

---

### Phase 3 final checkpoint

```bash
pnpm lint
pnpm check-types
pnpm --filter extension build
```

Expected: all exit `0`. Reload the extension in Chrome (`chrome://extensions → Reload`).

---

## Phase 4 — Polish & contracts

### Sub-step 4.1.a — Verify the three list states

**Action**

- Open the extension side panel and navigate to `/settings`.
- Check the **loading**, **error**, **empty** (and **empty-after-search**) states render with the right copy.

**Checkpoint**

```bash
grep -n "No providers configured\|No providers match your search\|Failed to update active provider" apps/extension/src/components/providers-list-section.tsx
```

Expected: at least one hit per string. Open the file and confirm the strings are inside JSX, not in a comment.

---

### Sub-step 4.2.a — Verify CSS variables, not literals

**Action**

- Open each new module file and confirm there are no hex colors, no pixel font sizes (except icon sizes that are documented MUI conventions like `fontSize: '0.75rem'`), and no magic spacing.

**Checkpoint**

```bash
for f in \
  apps/extension/src/components/style/provider-credential-row.module.css \
  apps/extension/src/components/style/provider-card.module.css \
  apps/extension/src/components/style/providers-list-section.module.css; do
    echo "--- $f ---"
    grep -nE "#[0-9a-fA-F]{3,6}" "$f" || echo "(no hex literals)"
  done
pnpm lint:css
```

Expected: every file prints `(no hex literals)`; `lint:css` exits `0`.

---

### Sub-step 4.3.a — Verify no inline CSS

**Action**

- Scan the new TSX files for any `style=` prop.

**Checkpoint**

```bash
grep -nE "style=\{" \
  apps/extension/src/components/provider-card.tsx \
  apps/extension/src/components/provider-credential-row.tsx \
  apps/extension/src/components/providers-list-section.tsx \
  apps/extension/src/routes/settings.tsx
```

Expected: nothing. (Legitimate `sx={...}` MUI props are fine; the grep targets inline `style`.)

---

### Sub-step 4.4.a — Verify shared types are imported, not redeclared

**Action**

- Search the new files for any locally-declared `ApiKeyData` or `PaginatedApiKeysResponse` (the latter is OK locally in `db/common-cache.ts` for `CachedApiKeysPage`'s `items`, but the **type alias** for `PaginatedApiKeysResponse` must come from `@repo/shared-types`).

**Checkpoint**

```bash
grep -nE "(interface|type)\s+(ApiKeyData|PaginatedApiKeysResponse)" \
  apps/extension/src/components \
  apps/extension/src/hooks \
  apps/extension/src/db \
  -r
```

Expected: nothing. The only allowed declaration is `interface CachedApiKeysPage` in `apps/extension/src/db/common-cache.ts`.

```bash
grep -n "import.*ApiKeyData\|import.*PaginatedApiKeysResponse" \
  apps/extension/src/components/provider-card.tsx \
  apps/extension/src/hooks/use-api-keys-cache.ts \
  apps/extension/src/db/api-keys-cache.ts \
  apps/extension/src/realtime/realtime-handler.ts \
  apps/extension/src/background/handlers/api-key-handler.ts
```

Expected: at least one hit per file.

---

### Sub-step 4.5.a — Smoke test in the browser

**Action** — walk through all 11 steps from the plan. For each, the **expected** column is the pass criterion.

| #   | Action                                                                                                                     | Expected                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sign in as a fresh user. Open `/settings`.                                                                                 | Account-detail card shows email. Providers section shows "No providers configured."                                                      |
| 2   | Add a Gemini provider in the web app. Wait a few seconds.                                                                  | One row appears in the extension list, radio checked (active) and disabled.                                                              |
| 3   | Click the eye icon on the `apiKey` row.                                                                                    | Value is fetched via `DECRYPT_API_KEY` and rendered as plaintext. Click again → hides. Click copy → snackbar "Copied".                   |
| 4   | Add an OpenAI provider in the web app.                                                                                     | A new row appears (via `RESOURCE_CHANGED` `apiKey:create`). First row still active, new one not.                                         |
| 5   | Click the radio on the new row in the extension.                                                                           | Becomes active (optimistic). Backend confirms via `RESOURCE_CHANGED` `apiKey:setActive`. First row's radio goes off. No visible flicker. |
| 6   | Search "openai" in the extension.                                                                                          | Only the second row remains. Clear search → both rows return.                                                                            |
| 7   | Scroll down on a long list (seed with `apps/backend/scripts/seed-api-keys-for-api-configuration-pagination.ts` if needed). | Pagination: bottom sentinel triggers `GET_CONFIGURED_PROVIDERS` for `page=2`.                                                            |
| 8   | Delete a provider in the web app.                                                                                          | The extension list refetches and the row is gone.                                                                                        |
| 9   | Inspect `/settings` in the extension.                                                                                      | **Delete Account** section is **not** present.                                                                                           |
| 10  | Inspect every provider card.                                                                                               | No "Add New" button, no edit icon, no delete icon.                                                                                       |
| 11  | Click the info banner's "web application" link.                                                                            | Opens `${VITE_WEB_APP_URL}:${VITE_WEB_APP_PORT}/settings` in a new tab.                                                                  |

**Checkpoint**

```bash
grep -n "Delete Account\|DeleteAccountSection" apps/extension/src/routes/settings.tsx apps/extension/src/components/providers-list-section.tsx
```

Expected: nothing.

```bash
grep -RnE "Add New|EditProvider|DeleteProvider" apps/extension/src/components/providers-list-section.tsx apps/extension/src/components/provider-card.tsx
```

Expected: nothing.

---

## Phase 4 final checkpoint

```bash
pnpm lint
pnpm check-types
pnpm lint:css
pnpm --filter extension build
```

Expected: every command exits `0`. All 11 smoke-test rows pass.

---

## Rollback / "something broke" checklist

If a checkpoint fails:

1. **`pnpm --filter extension check-types` fails**
   - Most likely: a missing import in a new hook / cache file. Cross-check against the `personas-cache.ts` and `use-personas-cache.ts` analogues.
2. **`pnpm lint:css` fails on a new module**
   - Most likely: a hex color or literal `px` font size. Replace with the matching CSS variable from `packages/ui/src/constants/css-constants.css`.
3. **`pnpm --filter extension build` fails after Step 2.4**
   - Most likely: `sendResponse` was not awaited inside the new branch — confirm the branch ends with `return true;`.
4. **Smoke test step 5 flickers**
   - Most likely: `handleSetActive` is calling `invalidateCache()` itself. Remove it; the realtime `setActive` event will do the patch.
5. **Smoke test step 4 doesn't update the list**
   - Most likely: the `useEffect` listener checks `payload.resource !== 'apiKey'`. Re-read the broadcast path in `realtime-owner.ts` and confirm the field name.
6. **Smoke test step 3 throws decrypt error**
   - Most likely: the response shape changed. Open `apps/extension/src/background/handlers/api-key-handler.ts` and confirm `DECRYPT_API_KEY` returns `{ success, data }` (not `{ success, data: { value } }`).

---

## Suggested PR cadence (small diffs, easy review)

| PR  | Steps         | Reviewable in isolation?                     |
| --- | ------------- | -------------------------------------------- |
| 1   | 0.1.a → 0.5.a | yes — pure data layer, no UI yet             |
| 2   | 1.1.a → 1.3.a | yes — realtime wiring, no UI yet             |
| 3   | 2.0.a → 2.1.b | yes — banner + credential row (still unused) |
| 4   | 2.2.a → 2.2.b | yes — provider card (still unused)           |
| 5   | 2.3.a → 2.5.a | yes — list section + handler + message union |
| 6   | 3.1.a → 3.3.a | yes — wire the route, delete the old code    |
| 7   | 4.1.a → 4.5.a | polish + smoke tests, no code change usually |

Each PR passes `pnpm lint && pnpm check-types && pnpm lint:css`. After PR 6 the smoke tests must pass before merging PR 7.
