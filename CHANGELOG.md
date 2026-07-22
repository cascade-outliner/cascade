# Changelog

## 2026-07-22
- [feat] Added a "Premium" tab in Settings where you can request (and remove) a premium seat, granted immediately, with a preview of what premium unlocks (starting with node version history) — the first step toward upcoming paid features. Premium users also get a small crown badge on their avatar. [#404](https://github.com/Patrickroelofs/cascade/issues/404)
- [feat] Added a "Version history" node context-menu action, gated behind a premium seat: every content edit is now kept as a retrievable prior version with a timestamp, and you can restore any of them, which itself becomes a new entry so the rest of the timeline is never lost. Non-premium users see an upsell in place of the version list. [#392](https://github.com/Patrickroelofs/cascade/issues/392)
- [fix] Fixed `createNode` rejecting an invalid `afterId` with an inconsistent `INVALID_ANCHOR`/422 error instead of the `NOT_FOUND`/404 used by every other node procedure. [#398](https://github.com/Patrickroelofs/cascade/issues/398)
- [fix] Fixed `createNode` silently inserting a node into the wrong sibling list when `afterId` referenced a node that wasn't actually a child of the requested parent (e.g. a stale anchor after a concurrent move); it now rejects the create instead. [#317](https://github.com/Patrickroelofs/cascade/issues/317)
- [feat] Changelog entries are now labeled Feature, Fix, or Chore, making it easier to scan what changed at a glance. [#406](https://github.com/Patrickroelofs/cascade/issues/406)
- [feat] Added a "Premium" tab in Settings where you can request (and remove) a premium seat, granted immediately, with a preview of what premium unlocks (starting with node version history) — the first step toward upcoming paid features. Premium users also get a small crown badge on their avatar. [#404](https://github.com/Patrickroelofs/cascade/issues/404)
- [fix] Fixed `createNode` rejecting an invalid `afterId` with an inconsistent `INVALID_ANCHOR`/422 error instead of the `NOT_FOUND`/404 used by every other node procedure. [#398](https://github.com/Patrickroelofs/cascade/issues/398)
- [fix] Fixed `createNode` silently inserting a node into the wrong sibling list when `afterId` referenced a node that wasn't actually a child of the requested parent (e.g. a stale anchor after a concurrent move); it now rejects the create instead. [#317](https://github.com/Patrickroelofs/cascade/issues/317)

## 2026-07-21
- [fix] Fixed the tag and due-date filters taking seconds to apply on deeply nested outlines with many collapsed nodes: resolving which rows a collapsed ancestor hides re-scanned the same descendants for every collapsed node in a chain instead of skipping rows already known hidden. [#374](https://github.com/Patrickroelofs/cascade/issues/374)
- [fix] Fixed node text being impossible to select with the mouse in Firefox: the whole row (not just its drag handle) was marked as a native drag source, and Firefox refuses to let you select text inside any draggable element. [#379](https://github.com/Patrickroelofs/cascade/issues/379)
- [feat] Added a "Duplicate" action to the node context menu: it copies a node's content, tags, due date, and type, recursively copies its entire subtree preserving structure and order, and inserts the copy as the next sibling. [#272](https://github.com/Patrickroelofs/cascade/issues/272)
- [fix] Fixed due-date filters only searching the first 500 loaded nodes, which made valid matches deeper in large outlines appear to be missing.
- [feat] Choose a Font size in Settings (Small, Default, Large, Extra large): it scales all text throughout the app, applies instantly with no reload, and is saved to your account across sessions and devices. [#282](https://github.com/Patrickroelofs/cascade/issues/282)
- [feat] The "Convert into" node context menu action now also converts a node's text into a heading (Heading 1 through Heading 6) or back into a plain paragraph, alongside the existing Text/Task options. [#351](https://github.com/Patrickroelofs/cascade/issues/351)
- [fix] Fixed `moveNode` silently corrupting sibling order when moving a node "before" or "after" a target that wasn't actually a child of the destination parent (e.g. a stale target after a concurrent move); it now rejects the move instead. [#292](https://github.com/Patrickroelofs/cascade/issues/292)
- [fix] Nesting is now unbounded: trees deeper than 64 levels used to render incompletely, and moving a node more than 64 levels below itself could silently corrupt the tree into a cycle. Both are fixed — depth has no cap and the "can't move into your own subtree" check now catches this at any depth. [#321](https://github.com/Patrickroelofs/cascade/issues/321)
- [fix] Fixed expanding a node with more than 500 visible descendants silently showing only the first 500; expanding now fetches every page of the subtree. [#322](https://github.com/Patrickroelofs/cascade/issues/322)
- [fix] Fixed due dates occasionally rendering a day off depending on your timezone: due dates are now stored and sent as plain calendar days instead of timestamps, so the day you pick is always the day that's saved. Existing due dates were backfilled to their UTC calendar day. [#323](https://github.com/Patrickroelofs/cascade/issues/323)
- [chore] A single node can now have at most 50 tags; the server rejects requests that try to set more, closing off a way to force an oversized bulk write with no legitimate use case. [#293](https://github.com/Patrickroelofs/cascade/issues/293)
- [fix] Creating a node now shows an error notification instead of failing silently if the request doesn't reach the server, and no longer risks losing the newly created row if another change refreshes the outline at the same moment. [#328](https://github.com/Patrickroelofs/cascade/issues/328)
- [fix] Fixed the login and register pages triggering an unauthenticated settings request that logged a spurious 401 error in the browser console and server logs. [#357](https://github.com/Patrickroelofs/cascade/issues/357)
- [fix] Fixed the "Due in range" filter hiding nodes due on the range's end day whenever their due date carried a time later than midnight. [#315](https://github.com/Patrickroelofs/cascade/issues/315)
- [fix] Toggling a node's expanded state, setting its due date or type, and editing its content now return a proper error instead of silently succeeding when the node id doesn't exist or belongs to another user. [#295](https://github.com/Patrickroelofs/cascade/issues/295)

## 2026-07-19
- [fix] Primary action buttons (submit, add node, save) now use their own color instead of borrowing the "danger" one, so they read as a clear call to action instead of a warning in every theme, with legible text everywhere. [#284](https://github.com/Patrickroelofs/cascade/issues/284)
- [fix] Cascade no longer hard-codes app manifest colors that could clash with your active theme, and the browser UI color now follows the current theme after the app loads instead of staying stuck on the default light color. [#278](https://github.com/Patrickroelofs/cascade/issues/278)
- [fix] If your saved settings ever fail to load (e.g. after a stored theme or font is no longer available), Cascade now shows a notification and resets them to their defaults instead of applying them in a broken state. [#228](https://github.com/Patrickroelofs/cascade/issues/228)
- [feat] Themes have a new "Sync with system" option: pick which theme to use in light mode and which to use in dark mode, and Cascade switches between them automatically as your OS's light/dark setting changes. [#228](https://github.com/Patrickroelofs/cascade/issues/228)
- [feat] Pick a theme for the whole app in Settings: besides the classic Cascade Light and Cascade Dark looks there are now Catppuccin (Latte, Frappé, Macchiato, Mocha), Nord, and Dracula palettes. Your choice applies instantly, is saved to your account, and follows you across devices. [#228](https://github.com/Patrickroelofs/cascade/issues/228)
- [feat] Choose the app's font in Settings: keep the default Bitter or switch to your system's sans-serif, serif, or monospace font. The selection is saved to your account and persists across sessions and devices. [#227](https://github.com/Patrickroelofs/cascade/issues/227)

## 2026-07-18
- [feat] URLs you paste or type into a node now turn into tidy links (e.g. `example.com/docs…`) instead of the full raw address. Click a link to see the full URL, edit its text or destination, or remove the link while keeping its text; the little arrow icon next to every link opens it directly in a new tab. [#183](https://github.com/Patrickroelofs/cascade/issues/183)
- [feat] Filter nodes by a **due date range**: pick a start and end date from the new "Due in range" calendar in the filter menu to see everything due between those days (inclusive). The active range appears as a removable chip in the filters bar and is bookmarkable via the URL. [#217](https://github.com/Patrickroelofs/cascade/issues/217)
- [fix] The `Due today` filter now searches the full outline, including tasks inside collapsed branches, so due tasks no longer disappear just because their parent is closed. [#203](https://github.com/Patrickroelofs/cascade/issues/203)
- [chore] Tag names are now capped at 64 characters: the tags editor shows a character counter near the limit and blocks over-long names with a clear message, and the server rejects them too. [#242](https://github.com/Patrickroelofs/cascade/issues/242)

## 2026-07-17
- [feat] The outline is now readable by screen readers as an actual tree (`role="tree"`/`"treeitem"` with level, position, and expanded state), and rows can be reordered among siblings from the keyboard with `Alt+Shift+Arrow, up or down`, not just by dragging.
- [fix] Fixed completed tasks disappearing from a due-date filter (e.g. `Due this week`) even when `Hide completed` was off. [#243](https://github.com/Patrickroelofs/cascade/issues/243)
- [feat] Filter on a specific due date: pick any day from a calendar in the filter menu to see everything due that day. [#216](https://github.com/Patrickroelofs/cascade/issues/216)
- [fix] Fixed a race where creating nodes quickly (e.g. rapid Enter presses or two open tabs) could give two siblings the same position, making rows jump around unpredictably. [#187](https://github.com/Patrickroelofs/cascade/issues/187)
- [feat] Settings (dark mode, indent size, and more) are now saved to your account when you close the settings dialog and follow you across devices. [#229](https://github.com/Patrickroelofs/cascade/issues/229)
- [feat] New `Hide completed` filter tucks away completed tasks (and their subtrees) to declutter the outline; it combines with the due-date filters. [#138](https://github.com/Patrickroelofs/cascade/issues/138)
- [feat] Filter on due date `this week`, showing everything due between Monday and Sunday of the current week; selecting it replaces the `today` filter and vice versa. [#215](https://github.com/Patrickroelofs/cascade/issues/215)

## 2026-07-16
- [feat] Nodes can now be tagged: add or create tags from the row's context menu or the node page, and delete a tag everywhere in one step. [#78](https://github.com/Patrickroelofs/cascade/issues/78)

## 2026-07-14
- [fix] Improve slug generation for nodes, ensuring uniqueness and better readability. [#182](https://github.com/Patrickroelofs/cascade/pull/182)
- [feat] Filter on due date `today`. [#174](https://github.com/Patrickroelofs/cascade/pull/174)
- [feat] Due dates can now be added to nodes. [#169](https://github.com/Patrickroelofs/cascade/pull/169)

## 2026-07-12
- [chore] Set up i18n, laying the groundwork for future language support, currently supporting English and Dutch.

## 2026-07-09
- [feat] Keyboard commands `Shift+Arrow, up or down` will move focus to the element above or below. [#71](https://github.com/Patrickroelofs/cascade/issues/71)

## 2026-07-08
- [feat] Users are now able to delete their account [#133](https://github.com/Patrickroelofs/cascade/issues/133)
- [feat] Added several oauth providers

## 2026-07-07
- [feat] Added authentication allowing users to log in with their personal accounts

## 2026-07-06
- [feat] Added an in-app changelog to Settings
