# Changelog

## 2026-07-19
- Themes have a new "Sync with system" option: pick which theme to use in light mode and which to use in dark mode, and Cascade switches between them automatically as your OS's light/dark setting changes. [#228](https://github.com/Patrickroelofs/cascade/issues/228)
- Pick a theme for the whole app in Settings: besides the classic Cascade Light and Cascade Dark looks there are now Catppuccin (Latte, Frappé, Macchiato, Mocha), Nord, and Dracula palettes. Your choice applies instantly, is saved to your account, and follows you across devices. [#228](https://github.com/Patrickroelofs/cascade/issues/228)
- Choose the app's font in Settings: keep the default Bitter or switch to your system's sans-serif, serif, or monospace font. The selection is saved to your account and persists across sessions and devices. [#227](https://github.com/Patrickroelofs/cascade/issues/227)

## 2026-07-18
- URLs you paste or type into a node now turn into tidy links (e.g. `example.com/docs…`) instead of the full raw address. Click a link to see the full URL, edit its text or destination, or remove the link while keeping its text; the little arrow icon next to every link opens it directly in a new tab. [#183](https://github.com/Patrickroelofs/cascade/issues/183)
- Filter nodes by a **due date range**: pick a start and end date from the new "Due in range" calendar in the filter menu to see everything due between those days (inclusive). The active range appears as a removable chip in the filters bar and is bookmarkable via the URL. [#217](https://github.com/Patrickroelofs/cascade/issues/217)
- The `Due today` filter now searches the full outline, including tasks inside collapsed branches, so due tasks no longer disappear just because their parent is closed. [#203](https://github.com/Patrickroelofs/cascade/issues/203)
- Tag names are now capped at 64 characters: the tags editor shows a character counter near the limit and blocks over-long names with a clear message, and the server rejects them too. [#242](https://github.com/Patrickroelofs/cascade/issues/242)

## 2026-07-17
- The outline is now readable by screen readers as an actual tree (`role="tree"`/`"treeitem"` with level, position, and expanded state), and rows can be reordered among siblings from the keyboard with `Alt+Shift+Arrow, up or down`, not just by dragging.
- Fixed completed tasks disappearing from a due-date filter (e.g. `Due this week`) even when `Hide completed` was off. [#243](https://github.com/Patrickroelofs/cascade/issues/243)
- Filter on a specific due date: pick any day from a calendar in the filter menu to see everything due that day. [#216](https://github.com/Patrickroelofs/cascade/issues/216)
- Fixed a race where creating nodes quickly (e.g. rapid Enter presses or two open tabs) could give two siblings the same position, making rows jump around unpredictably. [#187](https://github.com/Patrickroelofs/cascade/issues/187)
- Settings (dark mode, indent size, and more) are now saved to your account when you close the settings dialog and follow you across devices. [#229](https://github.com/Patrickroelofs/cascade/issues/229)
- New `Hide completed` filter tucks away completed tasks (and their subtrees) to declutter the outline; it combines with the due-date filters. [#138](https://github.com/Patrickroelofs/cascade/issues/138)
- Filter on due date `this week`, showing everything due between Monday and Sunday of the current week; selecting it replaces the `today` filter and vice versa. [#215](https://github.com/Patrickroelofs/cascade/issues/215)

## 2026-07-16
- Nodes can now be tagged: add or create tags from the row's context menu or the node page, and delete a tag everywhere in one step. [#78](https://github.com/Patrickroelofs/cascade/issues/78)

## 2026-07-14
- Improve slug generation for nodes, ensuring uniqueness and better readability. [#182](https://github.com/Patrickroelofs/cascade/pull/182)
- Filter on due date `today`. [#174](https://github.com/Patrickroelofs/cascade/pull/174)
- Due dates can now be added to nodes. [#169](https://github.com/Patrickroelofs/cascade/pull/169)

## 2026-07-12
- Set up i18n, laying the groundwork for future language support, currently supporting English and Dutch.

## 2026-07-09
- Keyboard commands `Shift+Arrow, up or down` will move focus to the element above or below. [#71](https://github.com/Patrickroelofs/cascade/issues/71)

## 2026-07-08
- Users are now able to delete their account [#133](https://github.com/Patrickroelofs/cascade/issues/133)
- Added several oauth providers

## 2026-07-07
- Added authentication allowing users to log in with their personal accounts

## 2026-07-06
- Added an in-app changelog to Settings
