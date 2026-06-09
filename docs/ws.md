# Realtime Sync Plan — Web ↔ Backend ↔ Extension

> **Status:** Plan only. No code in this file.
> **Goal:** When a user changes `persona / resume / resume-version` in one client (web tab, web in another browser, or extension side panel), the change should appear in every other live client of the same user — without a manual refresh.

---

## 1. Why we need this

Today the data flow is one-way request/response over HTTP:

```
UI ──HTTP──▶ Backend ──DB──▶
UI ◀──JSON── Backend
```

If the user creates a persona in `apps/web` and the extension side panel is open, the side panel doesn't know. The same is true for two open tabs of the web app in different browsers. A "sync" layer is what fills that gap.

**Constraint that shapes everything:** we want this to be purely additive. The existing REST flow keeps working. We do not change request/response contracts; we only add a server-push channel that says "this resource changed — go refetch."

---

## 2. Mental model (the only thing to internalize)

Think of a WebSocket as a **long-lived phone call** instead of letters (HTTP):

- **HTTP** = "Here's a letter, give me an answer." One letter at a time.
- **WS** = "I'm calling you. We can both talk whenever. The call stays open."

The server keeps a `Map<userId, Set<WebSocket>>` in memory (a "room"). When a socket connects, it joins the room for its user. When any REST handler writes to the DB, after the write succeeds, it calls a tiny `broadcast(userId, event)` helper that pushes one JSON message to every other socket in that user's room. Clients receive the message, look at the `resource` field, and invalidate the matching React Query / IndexedDB cache key.

That's the whole idea. Everything below is just disciplined execution of this idea so it doesn't rot as the app grows.

---

## 3. Scope we are designing for (so the plan scales)

We are designing for **scale in three directions** so that adding the next resource or the next user doesn't require rework:

1. **More resources.** Today: `persona`, `resume`, `resume-version`. Tomorrow: maybe `job`, `api-key`, `result`. The WS layer must accept a new resource by changing **one enum** and adding one call site in the controller — nothing else.
2. **More concurrent users.** A single Node process holds the `rooms` map; for the size of a job-filler app this is fine. The plan is written so we can move the rooms map to Redis pub/sub later by swapping a single adapter.
3. **More clients per user.** Web tab, extension side panel, maybe a second browser, maybe a future mobile. The room abstraction already covers this.

The two design choices that buy us all three:

- **One room per user (not per resource).** Room key = `user:{userId}`. The event payload carries a `resource` field; clients filter. This keeps the server logic trivial and the number of "rooms" = number of users, not number of (user × resource) pairs.
- **Event payloads are notifications, not data.** Each event is small: `{ resource, action, id, ... }`. The client always does a normal REST refetch for the fresh row(s). We never push full rows over WS. This means WS cost stays flat as row size grows, and the REST code path is still the single source of truth.

---

### 3.1 Event flavors: in-place patch vs. invalidate

The `resource.changed` event comes in two flavors, decided by whether the event changes the _set of rows_ or just the _content of existing rows_:

| Action              | Row set changes?  | Event includes `data`? | Client behavior                                       |
| ------------------- | ----------------- | ---------------------- | ----------------------------------------------------- |
| `update`            | No                | **Yes** (full row)     | Replace the row by `id` in every cache that holds it. |
| `setActive`         | No                | **Yes** (full row)     | Same: replace. Emitted once per affected resource.    |
| `create` / `branch` | **Yes** (added)   | No                     | Invalidate the affected list(s), refetch.             |
| `delete`            | **Yes** (removed) | No                     | Invalidate the affected list(s), refetch.             |

The envelope is unchanged:

```jsonc
{
  "type": "resource.changed",
  "resource": "persona" | "resume" | "resume-version",
  "action": "update" | "setActive" | "create" | "branch" | "delete",
  "id": "<id>",
  "data": { /* full row — present only for update / setActive */ }
}
```

`setActive` still emits one event per affected resource (e.g. for version, resume, and persona), each with its own `data`. The client patches all three.

Fallback rule: if a client sees a `data` field it doesn't know how to apply, it ignores `data` and invalidates. If it sees no `data` field on an `update`/`setActive` event (older server), it invalidates. The protocol stays additive in both directions.

This rule simplifies Checkpoints 2, 3, and 4 (deltas noted inline in those sections below).

---

## 4. Architecture at a glance

```
┌────────────┐  HTTP  ┌────────────┐  HTTP  ┌────────────┐
│  apps/web  │◀──────▶│            │◀──────▶│ apps/      │
│  (React)   │        │            │        │ extension  │
│  RQ cache  │  WS    │  apps/     │  WS    │ (SW + IDB) │
│  ◀─────────┼────────┤  backend   ├────────┼──────────▶ │
│  invalidate│  event │  REST + WS │  event │ invalidate │
└────────────┘        │  rooms map │        └────────────┘
                      └────────────┘
```

Three new things on the server, one new provider in the web app, one new owner in the extension. Everything else stays as it is.

---

## 5. The plan, broken into 8 checkpoints

Each checkpoint is a **stop-and-verify point**. We finish a checkpoint, you test it in a real running app, and only then do you say "continue" for the next one. No big-bang change.

### Checkpoint 0 — Theory + dummy (already done)

- We built `/tmp/ws-dummy` to internalize the model. You're here.

### Checkpoint 1 — Backend WS server skeleton (no broadcasts yet)

- Add a `ws` server attached to the existing HTTP server at path `/ws`.
- Use the `noServer: true` pattern from the `ws` docs and hook into the existing HTTP server's `upgrade` event, so we can reject unauthenticated upgrades with `HTTP/1.1 401 Unauthorized\r\n\r\n` _before_ the socket is created. Same posture as the REST auth middleware.
- Auth: read JWT from the `Sec-WebSocket-Protocol` header, as a single subprotocol token (the only header the browser's `WebSocket` constructor lets the client set; works for both web and extension clients). The header value is the JWT itself — base64url characters only, which are all legal subprotocol-token characters per RFC 6455. A legacy `Bearer ` prefix is also accepted for backward-compat.
- Maintain `Map<userId, Set<WebSocket>>` in a `wsHub` module. On connect: verify token, put into room, send `hello` with `{ userId, peerCount }`. On close: remove from room. The `broadcast(userId, event)` is a placeholder that logs the event and does nothing yet.
- **No automated tests.** You test by hand.
- **Stop and verify (manual):** start the backend, then in a terminal run the snippet below (substitute a real JWT and the backend port from `.env`). You should see `OPEN` followed by `MSG {"type":"hello","userId":"<id>","peerCount":1}`. Open a second terminal with the same snippet — its `peerCount` should be 2. `Ctrl+C` one of them, the other stays `OPEN`. Run the snippet a third time without a JWT, expect the connection to be rejected.

```bash
# Run from inside apps/backend so node finds the workspace's `ws` symlink.
# (Bare `node -e` from the repo root won't resolve `require('ws')`.)
#
# The JWT is passed as the 2nd constructor arg (`protocols`) — not via the
# `headers` option — because the `ws` client only registers the value in its
# internal `protocolSet` when it's passed this way. Without that registration,
# the client fails the response with "Server sent a subprotocol but none was
# requested" even though the same header value was sent. This matches what a
# real browser does: `new WebSocket(url, [jwt])`.
cd apps/backend && node -e 'const W=require("ws");const ws=new W("ws://localhost:8000/ws",["<token>"]);ws.on("open",()=>console.log("OPEN"));ws.on("message",m=>console.log("MSG",m.toString()));ws.on("close",(c,r)=>console.log("CLOSE",c,r&&r.toString()));ws.on("error",e=>console.log("ERR",e.message));'
```

### Checkpoint 2 — Backend broadcast helper, wired into 3 controllers

- Promote `broadcast` to a real function that iterates the room and `ws.send`s JSON.
- Define the event shape in `@repo/shared-types` (single source of truth for both sides). One type per resource: `PersonaChangedEvent`, `ResumeChangedEvent`, `ResumeVersionChangedEvent`. All extend a base `ResourceChangedEvent`.
- In `persona-controller.ts`, `resume-controller.ts`, `resume-version-controller.ts`: after every successful `create / update / delete / setActive / branch`, call `wsHub.broadcast(userId, event)`. We do this in the controller layer, not in a TypeORM subscriber, because the controller is the only place that knows the `userId` and the `action` cleanly.
- For `setActive` we send **three** events (version + resume + persona each changed) so all caches invalidate.
- **Stop and verify:** with a manual `node -e` WS client subscribed as the same user, do a `POST /api/persona` from the existing web app. The WS client receives the event JSON.

### Checkpoint 3 — Web: WS client + `RealtimeSyncProvider`

- Add `apps/web/src/realtime/` with:
  - `realtime-client.ts` — opens one WS connection, exponential backoff reconnect, sends JWT in `Sec-WebSocket-Protocol`.
  - `realtime-provider.tsx` — React provider mounted in `main.tsx` near `<QueryClientProvider>`. Subscribes once.
  - A `resource-to-query-key` map: `persona → PERSONA_KEYS.lists()`, `resume → RESUME_KEYS.lists()`, `resume-version → invalidate whole RESUME_KEYS for safety (versions are tied to a resume)`.
- On event: `queryClient.invalidateQueries({ queryKey: ... })`. Existing `onSuccess` mutations keep working — they just become redundant.
- **Stop and verify:** open two web tabs as the same user, create a persona in tab A, see it appear in tab B without refresh. Then close the backend (`Ctrl+C`) and reopen it; tabs reconnect and resync.

### Checkpoint 4 — Extension: background WS owner + cache invalidation

- The extension's background service worker is the right home for the WS (it lives longer than the side panel).
- Open one WS at service-worker startup, with the JWT read from `chrome.storage.session` (the same place the auth sync flow already puts it).
- On event: `chrome.runtime.sendMessage({ action: 'RESOURCE_CHANGED', ... })` to the side panel.
- The side panel listens, calls the existing `usePersonasCache / useResumesCache / useResumeVersionsCache` `invalidateCache` methods, and re-fetches (and clears stale pages from IndexedDB).
- **Stop and verify:** with the web app and the extension side panel both open as the same user, create a persona in the web app; the side panel's persona list updates without a refresh. Reconnect: kill backend, restart, side panel recovers.

### Checkpoint 5 — Cross-tab in the same browser (extension ↔ web tab)

- The web app opens its own WS from the React app. The extension opens its own WS from the background. Both are in the same user's room.
- **Stop and verify:** identical to Checkpoint 4 but explicitly demonstrate the web tab and the side panel are _separate_ WebSocket connections on the same server, both getting the same event.

### Checkpoint 6 — Cross-browser (optional v1, included in plan)

- A second browser profile hits the same backend. Because auth is JWT, the second browser opens its own WS in the same user room, and gets the same events.
- **Stop and verify:** Chrome A creates a persona; Chrome B's open web tab updates.

### Checkpoint 7 — Hardening (backpressure, slow consumers, errors)

- Wrap `ws.send` in a try/catch; drop the message for a socket that is `CLOSED` or whose `bufferedAmount` exceeds a threshold (e.g. 1 MB) — better to lose a notification than to OOM.
- Catch JSON serialization errors in the controller's broadcast call (never let a sync bug break a real DB write).
- Add `peerCount` to the `hello` message for debugging.
- **Stop and verify:** force an error path (e.g. malformed event) and confirm the DB write still succeeded and no socket is leaked.

### Checkpoint 8 — Documentation + handoff

- Update `docs/ws.md` (this file) with the final state.
- Add a "How to test sync" section to the repo `README.md`.
- A short "operations" note: how to watch WS connections in production, what to alert on.

---

## 6. Why we stop at each checkpoint

The point of stopping is **risk**. Each checkpoint:

1. Has a single, observable behavior change.
2. Can be reverted by deleting ~50 lines.
3. Adds a layer without removing one (the REST flow keeps working).
4. Has a manual smoke test that takes <2 minutes.

If any checkpoint fails, you stop. We don't paper over it with the next one.

---

## 7. Non-goals (so we don't accidentally scope-creep)

- We are not building a CRDT, not doing offline-first, not doing conflict resolution.
- We are not replacing REST. WS is a notification channel; data goes over HTTP like today.
- We are not pushing full rows over WS. Events carry `id` only; clients refetch. *(Exception: §3.1 — for in-place updates we *do* include the full row, and only for `update` / `setActive`. Anything that adds or removes a row still goes the `id`-only + invalidate route.)*
- We are not implementing presence, typing indicators, or any non-CRUD signal.
- We are not adding Socket.IO. The `ws` package is enough and has fewer surprises.

---

## 8. Open questions we will answer inline (not now)

- **Should events include the new `updatedAt` so clients can short-circuit a refetch?** Probably yes later, but not in v1. Refetch is cheap and correct.
- **Do we need a "missed events since lastEventId" replay on reconnect?** Nice-to-have, not in v1. We'll add it later if we see flicker.
- **Should the extension background worker hold the WS across side-panel opens/closes?** Yes — the SW is the long-lived owner. The side panel joins/leave; the SW does not.

---

## 9. Glossary

- **Room** — `Map<userId, Set<WebSocket>>` on the server; an addressable group of sockets for one user.
- **Event** — one JSON message sent from server to client. Has a `resource` (e.g. `persona`) and an `action` (`created` / `updated` / `deleted`).
- **Notification channel** — the WS connection. It does not carry data; it carries "go refetch" hints.
- **Owner** — the long-lived process that holds the WS open. On the web, the React app. On the extension, the background service worker.

---

## 10. File the first checkpoint will touch (preview only — not in this doc)

- `apps/backend/package.json` — add `ws`.
- `apps/backend/src/index.ts` — attach WS server.
- `apps/backend/src/realtime/ws-hub.ts` — the `rooms` map + broadcast.
- `apps/backend/src/realtime/ws-auth.ts` — verify JWT in `Sec-WebSocket-Protocol`.
- `apps/backend/src/realtime/__tests__/ws-hub.test.ts` — unit test.
- `packages/shared-types/src/realtime.ts` — new file with the event types.

That's it for Checkpoint 1. No controller, no web, no extension changes yet.

---

## 11. Coding rules (for the implementation checkpoints)

- **No comments at every change point.** Code is the _what_. The _why_ of any non-obvious decision lives here in `docs/ws.md`, not scattered through the code.
- **Inline comments are reserved for genuinely non-obvious _why_** — e.g. a tricky WebSocket lifecycle detail, a `bufferedAmount` check, a place where the obvious code would be wrong. If removing the comment still leaves the code clear, remove the comment.
- **Explanations of shape, design, and trade-offs go in this doc**, in the relevant checkpoint section or in a dedicated "Implementation notes" sub-section added when needed.
- When in doubt, write the _why_ in `docs/ws.md`, not in the code.

---

## 12. Ports

During development the web app and the backend run on **separate ports**:

- Backend (Express + WS): its own port, controlled by `NODE_PORT` in `.env` (currently `8000`).
- Web (Vite dev): its own port from `VITE_WEB_APP_PORT` (currently `5173`).

The web's WS client reads the backend's WS URL from an env var. We'll add `VITE_WS_URL` to `.env.example` and `apps/web/vite.config.ts` (or the client's connection code) in **Checkpoint 3**, when the web actually opens a WS. For Checkpoint 1, the backend doesn't need to know the web port at all — it just listens on its own port and accepts upgrades on `/ws`.

Production: the backend serves the built web app from `apps/web/dist` on the backend's port (already wired in `apps/backend/src/index.ts`). In prod, both end up on the same port. The WS path `/ws` is on the same origin, no env var needed.

---

## 13. Implementation notes (consolidated, by topic)

These notes explain the _why_ of non-obvious decisions in the WS layer. The implementation checkpoints should not repeat this in code comments.

- **Why `ws` and not Socket.IO:** the `ws` package is a minimal, fast, RFC-6455-compliant implementation. We don't need rooms/namespaces (we have our own `wsHub` keyed by `userId`), we don't need fallback transports (we require WS — modern browsers and the Chrome extension both support it), and we don't need the auto-reconnect logic on the server side (clients handle that). Smaller surface, fewer surprises.
- **Why `Sec-WebSocket-Protocol: <jwt>` (not `Bearer <jwt>`):** the browser `WebSocket` constructor and the Chrome extension `WebSocket` constructor both forbid setting arbitrary request headers. The only header the client can set is the subprotocol via `Sec-WebSocket-Protocol`. RFC 6455 restricts subprotocol tokens to the `token` character set (no spaces, no commas inside a token). The `ws` library enforces this on the server and aborts the handshake with `400 Bad Request` if the value doesn't parse — a single extra space (e.g. `Bearer <jwt>`) is enough to fail. JWTs are base64url (`A–Z a–z 0–9 - _`), all legal token characters, so the JWT itself is a valid single subprotocol token. We use the JWT as the entire subprotocol value, and the same `verifyToken` from the REST middleware parses it without a second code path. A legacy `Bearer ` prefix is also accepted in `authenticateUpgrade` for backward-compat.
- **Why the JWT being visible in DevTools is acceptable:** the JWT appears in the `Sec-WebSocket-Protocol` request header, so a user can read it from the browser's Network panel. This is the _same_ exposure as the REST `Authorization: Bearer <jwt>` header on every other request — putting the token in the subprotocol doesn't enlarge the attack surface, it just relocates it within DevTools. The mitigations are unchanged from REST: serve the WS endpoint over `wss://` in any real deployment (TLS encrypts the header on the wire; the dev `ws://` on `localhost` is plain only because it's local), keep JWT lifetimes short, and rotate the secret if a token is ever leaked. Short-lived tokens + a refresh flow is the durable fix for both REST and WS; it's out of scope for Checkpoint 1.
- **Why the `noServer: true` + `upgrade` hook pattern:** it lets us reject the upgrade with `HTTP/1.1 401 Unauthorized\r\n\r\n` _before_ the socket exists, so we never hold a half-open unauthenticated socket in memory. This is the pattern the `ws` docs recommend for client authentication.
- **Why `Map<userId, Set<WebSocket>>`:** one entry per active user; the set is small (one socket per tab / side-panel instance). Memory is `O(active users)`. For multi-instance scale-out, this becomes a Redis pub/sub adapter — see §3.
- **Why we leave `perMessageDeflate` off on the server:** the `ws` docs flag the memory/CPU cost. Notifications are small JSON; we don't need compression. If we ever push large payloads (we won't — see §7), we'll revisit.
- **Why ping/pong is in Checkpoint 7 and not Checkpoint 1:** a 30 s `ping` + `isAlive` + `terminate()` loop is the standard way to detect half-open connections, but Checkpoint 1 is "skeleton, no broadcasts". The ping/pong loop is part of the _Hardening_ checkpoint, not the skeleton. Noted now so we don't forget.
- **Why `ws` + `@types/ws` versions:** we pin `ws: ^8.21.0` (latest as of writing, RFC-6455, zero runtime deps) and `@types/ws: ^8.18.1` (matching major, last published ~1 year ago, stable). No native deps, no bufferutil/utf8-validate needed for our use case.
- **Why `handleProtocols` echoes the client's string back unchanged:** the `ws` library passes us the exact `Set<string>` of subprotocol strings the client offered in the `Sec-WebSocket-Protocol` header. To complete the handshake it must echo **the same string** back in the `Sec-WebSocket-Protocol` response header — byte-for-byte, no trimming, no reconstruction. Re-deriving the value (e.g. from the parsed token) doesn't work in practice: small differences (a stray space, a re-encoded character) cause the client's compare to fail and the upgrade ends with `400 Bad Request`. We just `return protocols.values().next().value` and the JWT parsing is done separately in `authenticateUpgrade`. The auth code never depends on `handleProtocols` having _understood_ the value.
- **Why path check is `path === '/ws'` and not `url.startsWith('/ws')`:** the previous `startsWith` matched `/wsfoo` and `/websocket` and was a footgun. A small `parsePath` strips the query string first so `/ws?foo=bar` still works.
- **Why `wss.handleUpgrade` is called inside a `Promise.then`, not synchronously in the upgrade handler:** the HTTP `upgrade` event fires _before_ the handshake is complete, and `handleUpgrade` writes the 101 response. The `authenticateUpgrade` step is async (it does a DB lookup), so we wait for the promise; if it rejects we write a `401` and destroy the socket before the WS handshake ever starts. That's the whole point of the `noServer: true` pattern from §13.
