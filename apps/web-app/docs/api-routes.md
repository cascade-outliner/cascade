# API Routes — `apps/web-app`

`apps/web-app` is the only app with a database and an API. It exposes a small set of raw HTTP file-routes plus an oRPC router that carries almost all application functionality. This document catalogs every HTTP-reachable route: the raw routes under `src/routes/api.*.ts`, and every procedure in the oRPC router (`src/orpc/router.ts`).

`apps/website` has no API of its own — its `/login` and `/register` routes are pure redirects to `apps/web-app`.

## Contents

- [Raw HTTP routes](#raw-http-routes)
- [oRPC transport](#orpc-transport)
- [Auth & context](#auth--context)
- [`nodes.*`](#nodes)
- [`settings.*`](#settings)
- [`sessions.*`](#sessions)
- [`premium.*`](#premium)
- [`onboarding.*`](#onboarding)
- [`accountData.*`](#accountdata)
- [`treeHistory.*`](#treehistory)

---

## Raw HTTP routes

These are `@tanstack/react-router` file-routes with hand-written `server.handlers`, not oRPC procedures. They live in `apps/web-app/src/routes/`.

| Route | File | Methods | Purpose |
|---|---|---|---|
| `/api/rpc/$` | `api.rpc.$.ts` | `POST` | oRPC **RPC protocol** endpoint — this is what the web app's own client (`src/orpc/client.ts`) talks to. |
| `/api/$` | `api.$.ts` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` | oRPC **OpenAPI-style** endpoint — mounts the same router for REST/OpenAPI-shaped external consumption. |
| `/api/auth/$` | `api.auth.$.ts` | `GET`, `POST` | better-auth's own handler (`auth.handler(request)`) — login, register, session, OAuth callback, etc. See [Auth & context](#auth--context). |
| `/api/maintenance/purge-tree-history` | `api.maintenance.purge-tree-history.ts` | `POST` | Token-authenticated maintenance endpoint to purge old `tree_history_events`/`tree_history_snapshots` rows. See below. |

### `/api/rpc/$` and `/api/$` — the oRPC router

Both routes mount the exact same router (`src/orpc/router.ts`) against the exact same context (`createContext`, which resolves the better-auth session from the request's cookies). They differ only in transport:

- **`/api/rpc/$`** uses `@orpc/server/fetch`'s `RPCHandler` with `prefix: "/api/rpc"`. This is oRPC's own compact RPC protocol (single POST per call, JSON body). It's **POST-only by design** — mutations must never be reachable over GET, and the RPC protocol has no need for other verbs. This is what `apps/web-app`'s browser client actually calls.
- **`/api/$`** uses `@orpc/openapi/fetch`'s `OpenAPIHandler` with `prefix: "/api"`, plus `SmartCoercionPlugin` (coerces query/path string params to the right JSON types per each procedure's Zod input schema). This exists for OpenAPI/REST-shaped external consumption of the same procedures.

No procedure in this codebase defines an explicit `.route({ method, path })` (or `.meta(...)`) contract — none were found anywhere under `src/features/*/server/procedures/`. That means every procedure is exposed at both endpoints purely by oRPC's default router-key-derived path and default HTTP-verb inference; there are no custom REST shapes (e.g. `GET /nodes/:id`) layered on top of the router keys documented below.

Every procedure call — regardless of endpoint — goes through `createContext`, which resolves `context.session` via `auth.api.getSession({ headers })`. Procedures built on `authed` then require that session to be non-null (see [Auth & context](#auth--context)).

### `/api/maintenance/purge-tree-history` — tree-history purge

Not part of the oRPC router; a plain `POST` handler (`handleTreeHistoryPurgeRequest`) intended for a deployment cron/systemd timer, not the web client.

- **Auth**: `Authorization: Bearer <TREE_HISTORY_PURGE_TOKEN>`, compared with `crypto.timingSafeEqual`. Returns `503` if `TREE_HISTORY_PURGE_TOKEN` isn't configured (env var, ≥32 chars), `401` if the header is missing/wrong.
- **Body** (JSON): `{ days?: number (int, ≥0, default TREE_HISTORY_RETENTION_DAYS), dryRun?: boolean (default false) }`. `400` on an invalid body.
- **Behavior**: purges `tree_history_events`/`tree_history_snapshots` older than `days` days for **all users** (not scoped to one account — this is an admin/ops endpoint). `days: 0` purges all existing history. `dryRun: true` previews without deleting.
- **Response**: `{ days, dryRun, purgedCount }`.

---

## Auth & context

- `apps/web-app` uses `@cascade/auth`'s `createAuth(db, { onUserCreated })` (`src/features/auth/server/auth.ts`), configured with email/password auth and (when `BETTER_AUTH_GOOGLE_CLIENT_ID`/`_SECRET` are set) Google OAuth. `onUserCreated` seeds the onboarding sample tree for new accounts.
- All better-auth endpoints (sign-up, sign-in, sign-out, session, OAuth callbacks, etc.) are proxied through `/api/auth/$` — their exact sub-paths are defined by better-auth itself, not by this app.
- Every oRPC procedure is built from one of two base builders in `src/orpc/context.ts` / `src/features/premium/server/premium-access.ts`:
  - **`authed`** — requires `context.session` to be non-null (resolved from the request's cookies via better-auth), else throws `UNAUTHORIZED` (`401`). Injects `context.user` and `context.currentSession` for the handler.
  - **`requirePremium`** — wraps `authed`; additionally throws `PREMIUM_REQUIRED` (`402`) unless the user has a row in `premium_seats`. Used only by `treeHistory.*`.
- There is no separate authorization/ACL layer: every procedure that touches `nodes`/`tags`/`statuses`/etc. filters by `context.user.id` itself. A new procedure that queries those tables must scope by user itself.
- Many mutating `nodes.*` procedures additionally gate on **per-user, per-feature capability flags** (`assertNodeCapabilityEnabled(userId, capability)`, backed by `settings.enabledNodeCapabilities`) — e.g. task/due-date/tags/board/icon/priority/recurrence/search/duplicate features can each be individually disabled per user. Noted per-procedure below where it applies.

---

## `nodes.*`

Router prefix `nodes`. All built on `authed` (no premium gate). Node rows share a common shape (`nodeColumns`), returned by `get`/`list`/`create`/`duplicate`/`restore`:

```
{
  id, parentId, content, type, metadata, expanded, order,
  dueDate, dueTime, recurrence, icon, priority,
  status: { id, name, color } | null,   // computed
  tags: string[],                        // computed
  hasChildren: boolean,                  // computed (EXISTS subquery)
  isBoard, parentIsBoard: boolean        // computed
}
```

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `nodes.create` | `createNode` | mutation | Insert under `parentId` (root if `null`), positioned after `afterId` or appended. Input: `{ parentId, afterId?, initialType?, dueDate?, dueTime?, tags? }`. Gates `task` type/due-date/tags behind capabilities. Takes the ordering advisory lock, computes a fractional `order`. Records a `node_created` history event. |
| `nodes.get` | `getNode` | query | `{ id }` → node row. `NOT_FOUND` (404) if missing/not owned. |
| `nodes.resolveSlug` | `resolveNodeSlug` | query | `{ slugId, slugText }` → `{ id }`. Full-UUID match, else UUID-prefix match disambiguated by `slugText`. `NOT_FOUND` (404) / `SLUG_AMBIGUOUS` (409). |
| `nodes.ancestors` | `getNodeAncestors` | query | `{ id }` → `{ id, content }[]`, root-first, via recursive CTE. |
| `nodes.visibleTree` | `visibleTree` | query | No input → `{ rows: FlatNodeRow[] }`, **every** node the user owns, flat and unordered (`SELECT … WHERE user_id = $userId` + joins for status/tags). The client now does tree assembly, DFS ordering, filtering, and collapse-gating itself — see note below. |
| `nodes.listDueSoon` | `listDueSoon` | query | No input → `{ tasks: DueSoonTask[] }` (`{ id, slug, label, dueDate, dueTime, recurrence }`). Tasks due in `[today-1, today+2]`, excluding completed ones; feeds the client-side due-date notification scheduler. |
| `nodes.quickOpen` | `quickOpen` | query | `{ query }` (≥2 chars after normalization) → up to 50 matches `{ id, slug, snippet, ancestors, omittedAncestorCount }`. Gated by the `search` capability; matches against a `search_text` column. |
| `nodes.createTag` | `createTag` | mutation | `{ name }` → void. Case-insensitive per-user uniqueness (`CONFLICT` 409). Gated by `tags` capability. |
| `nodes.move` | `moveNode` | mutation | `{ id, parentId, position: "before"\|"after", targetId }` or `{ id, parentId, position: "append" }` → void. Advisory lock; rejects moving a node into its own subtree (`INVALID_MOVE` 422); `NOT_FOUND` (404) for missing node/parent/target. Records `node_moved`. |
| `nodes.toggleExpanded` | `toggleNodeExpanded` | mutation | Flips a node's `expanded` flag. |
| `nodes.setBoardView` | `setNodeBoardView` | mutation | `{ id, isBoard }` → void. Gated by `board` capability when enabling. |
| `nodes.delete` | `deleteNode` | mutation | `{ id }` → `{ childrenDeleted: number }` (silently `0` if not found — no error). Recursive-CTE cascade delete; snapshots the subtree for undo. Records `subtree_deleted`. |
| `nodes.restore` | `restoreNode` | mutation | Undoes `delete`: reinserts a node + subtree from a snapshot (`root`, `descendants`, target position). `NOT_FOUND` (404) / `INVALID_MOVE` (422). Records `subtree_restored`. |
| `nodes.duplicate` | `duplicateNode` | mutation | `{ id }` → new root node row. Gated by `duplicate` capability. Recursive-CTE subtree copy, inserted as next sibling. Records `subtree_duplicated`. |
| `nodes.updateContent` | `updateNodeContent` | mutation | `{ id, content }`, content validated against a strict recursive Lexical schema (depth ≤8, ≤500 children/node, ≤20k chars/text-node, ≤256KB total). Gates block-type changes via capability. Recomputes `search_text`. Records `content_changed`. |
| `nodes.setType` | `setNodeType` | mutation | `{ id, type, metadata }` (discriminated by `type`). Gated by `task` capability when setting `type: "task"`. Clears `recurrence` when leaving `task`. Records `type_changed`. |
| `nodes.setDueDate` | `setNodeDueDate` | mutation | `{ id, dueDate, dueTime? }` → void. Gated by `due-date` capability. Recomputes `recurrence.anchorDay` if a recurring task's date changes. Records `due_date_changed`. |
| `nodes.setIcon` | `setNodeIcon` | mutation | `{ id, icon }` (single emoji or `null`) → void. Gated by `icon` capability. Records `icon_changed`. |
| `nodes.setRecurrence` | `setNodeRecurrence` | mutation | `{ id, recurrence }` → void. Gated by `recurrence` capability; requires `type: "task"` + a `dueDate` (`INVALID_NODE` 400 otherwise). Resets `metadata.completed` to `false`. Records `recurrence_changed`. |
| `nodes.setTaskCompleted` | `setTaskCompleted` | mutation | `{ id, completed, today, expectedDueDate }` → `{ advanced, nextDueDate }`. Gated by `task` capability; `NOT_FOUND` (404) unless `type: "task"`. Completing a recurring task advances `dueDate` (optimistic-concurrency guarded by `expectedDueDate`); otherwise just flips `completed`. Records `recurring_task_completed` or `type_changed`. |
| `nodes.setTags` | `setNodeTags` | mutation | `{ id, tags }` (≤50 tags) → void. Gated by `tags` capability. Full replace of a node's tag set. Records `tags_changed`. |
| `nodes.setPriority` | `setNodePriority` | mutation | `{ id, priority }` → void. Gated by `priority` capability. Records `priority_changed`. |
| `nodes.setStatus` | `setNodeStatus` | mutation | `{ id, boardId, statusId }` → void. Gated by `status` capability; re-validates `statusId` belongs to the same user+board (`STATUS_NOT_FOUND` 404). Records `status_changed`. |
| `nodes.listStatuses` | `listStatuses` | query | `{ boardId }` → `{ id, name, color, hidden, count }[]`, `count` = live usage per status. |
| `nodes.createStatus` | `createStatus` | mutation | `{ boardId, name, color? }` → `{ id, name, color }`. Gated by `status` capability. Case-insensitive per-board uniqueness (`CONFLICT` 409); auto-picks next palette color if omitted. |
| `nodes.updateStatus` | `updateStatus` | mutation | `{ id, boardId, name?, color?, hidden? }` → `{ id, name, color, hidden }`. Gated by `status` capability. `CONFLICT` (409) on name collision. |
| `nodes.deleteStatus` | `deleteStatus` | mutation | `{ id, boardId }` → void. Gated by `status` capability. Nodes referencing it have `status_id` cleared via FK `SET NULL` (not deleted). |
| `nodes.listTags` | `listTags` | query | No input → `{ name, count }[]`, usage count per tag. |
| `nodes.renameTag` | `renameTag` | mutation | `{ name, newName }` → void. Gated by `tags` capability. `NOT_FOUND` (404) / `CONFLICT` (409). Records `tag_renamed`. |
| `nodes.deleteTag` | `deleteTag` | mutation | `{ name }` → void. Gated by `tags` capability. Cascades `node_tags`. Records `tag_deleted` (with affected `nodeIds`, for restore). |

> **Documentation discrepancy worth flagging**: the top-level `CLAUDE.md` architecture notes describe `visibleTree` as a single recursive CTE that walks expanded nodes server-side with cursor pagination. The current implementation of `nodes.visibleTree` is a flat, unfiltered, unpaginated per-user `SELECT`, with tree assembly, DFS ordering, filtering, and collapse-gating now done client-side (`buildVisibleTree`/`getRowVisibility` in `packages/outliner`). Worth reconciling one or the other if this surprises anyone relying on the architecture doc.

---

## `settings.*`

Router prefix `settings`. Built on `authed`.

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `settings.get` | `getSettings` | query | No input → the user's stored `SettingsPatch` (`{}` if never saved). Covers theme, font, indent size, enabled node capabilities, `hideCompletedByDefault`, due-date notifications, banner dismissal, onboarding completion/sample-node ids. |
| `settings.update` | `updateSettings` | mutation | Input: partial `SettingsPatch` (see `settings.schema.ts` for the full field list/enums). Merges (via Postgres `jsonb ||`) into the stored row rather than overwriting, so concurrent updates from different devices don't clobber unrelated keys. Selecting a **premium theme** (`theme`/`lightTheme`/`darkTheme` set to a non-system, premium theme id) requires an active premium seat — throws `PREMIUM_REQUIRED` (402) otherwise. |

---

## `sessions.*`

Router prefix `sessions`. Built on `authed`. Manages the user's active better-auth sessions (multi-device sign-in list).

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `sessions.list` | `listSessions` | query | No input → `ActiveSession[]` (`{ id, ipAddress, userAgent, updatedAt, isCurrent }`), non-expired sessions for the user, current session sorted first. |
| `sessions.revoke` | `revokeSession` | mutation | `{ sessionId }` → `{ revoked: true }`. Refuses to revoke the caller's own current session (`CURRENT_SESSION` 400). `NOT_FOUND` (404) if the session doesn't exist/isn't owned. |
| `sessions.revokeOthers` | `revokeOtherSessions` | mutation | No input → `{ revokedCount }`. Deletes every session for the user except the current one ("sign out everywhere else"). |

---

## `premium.*`

Router prefix `premium`. Built on `authed`. There's no real payment flow here — granting/revoking a seat is immediate and idempotent, presumably a stand-in for a future billing integration.

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `premium.get` | `getPremiumStatus` | query | No input → `{ isPremium, grantedAt }`. |
| `premium.requestSeat` | `requestPremiumSeat` | mutation | No input → `{ isPremium, grantedAt }`. Inserts a `premium_seats` row (`onConflictDoNothing`); idempotent if already premium. |
| `premium.revokeSeat` | `revokePremiumSeat` | mutation | No input → `{ isPremium: false, grantedAt: null }`. Deletes the user's `premium_seats` row; idempotent. |

---

## `onboarding.*`

Router prefix `onboarding`. Built on `authed`.

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `onboarding.replay` | `replayOnboardingTour` | mutation | No input → re-seeds whatever sample nodes the onboarding tour needs (`ensureOnboardingSampleTree`) and marks the tour incomplete, so the client restarts the tour once the Settings dialog closes. |

---

## `accountData.*`

Router prefix `accountData`. Built on `authed`.

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `accountData.export` | `exportAccountData` | mutation | No input → a full JSON dump of everything the user owns: account info, settings, premium status, nodes, tags, statuses, node-tag associations, tree-history events, and tree-history snapshots. Every table is queried scoped to `context.user.id` (same as every other node/account procedure). |

---

## `treeHistory.*`

Router prefix `treeHistory`. Built on **`requirePremium`** — every procedure in this namespace additionally throws `PREMIUM_REQUIRED` (402) for non-premium users. Only events within the retention window (`TREE_HISTORY_RETENTION_DAYS`, default 30, `cutoff()` in `shared.ts`) are visible/restorable through these procedures — older rows persist in the database until purged (see [maintenance route](#apimaintenancepurge-tree-history--tree-history-purge)) but are treated as gone by the API.

| Router key | Function (file) | Kind | Notes |
|---|---|---|---|
| `treeHistory.list` | `listTreeHistory` | query | `{ cursor?: { createdAt, id } \| null, limit?: number (1–100, default 50) }` → `{ items: TreeHistorySummary[], nextCursor }`. Each item: `{ id, kind, nodeId, label, createdAt, restoredFromEventId, restorable, nodeDeleted }`. Cursor-paginated descending by time. |
| `treeHistory.get` | `getTreeHistoryEntry` | query | `{ id }` → the list-item shape plus `payload` (a discriminated union keyed by `kind` — content/type/due-date/icon/priority/status/recurrence/tags changes, node moves, subtree delete/restore/duplicate, tag create/rename/delete, recurring-task completion) and `snapshots` (ordered node snapshots for subtree-scoped events). `NOT_FOUND` (404) if missing/not owned/past cutoff. |
| `treeHistory.restore` | `restoreTreeHistoryEntry` | mutation | `{ id }` → `{ eventId, affectedNodeIds }`. Takes the ordering advisory lock, row-locks the event, checks it's one of the restorable kinds, then dispatches to a kind-specific internal restore handler (`src/features/tree-history/server/procedures/restore/*.ts`). `NOT_FOUND` (404, e.g. the node's own deletion must be restored first for node-scoped kinds), `NOT_RESTORABLE` (422, kind not restorable or a precondition no longer holds), `INVALID_MOVE` (422). A successful restore itself records a new history event referencing `restoredFromEventId`, so restores are themselves undoable/auditable. |

**History event kinds** (`kind` values seen across `list`/`get`): `node_created`, `subtree_duplicated`, `content_changed`, `node_moved`, `subtree_deleted`, `subtree_restored`, `type_changed`, `due_date_changed`, `icon_changed`, `priority_changed`, `status_changed`, `recurrence_changed`, `recurring_task_completed`, `tags_changed`, `tag_created`, `tag_renamed`, `tag_deleted`, `tag_restored`. History is written by the corresponding `nodes.*` mutation, not by a separate procedure — see the `nodes.*` table above for which mutation records which kind.
