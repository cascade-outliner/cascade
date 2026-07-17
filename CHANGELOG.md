# Changelog

## 2026-07-17
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
