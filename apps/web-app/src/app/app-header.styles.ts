import { cva } from "@cascade/ui/cva.config";

/** Flush/opaque strip on narrow viewports; an inset floating pill (blurred,
 * bordered, shadowed) at sm: and up, replacing the old full-width fade.
 * Deliberately below the Agenda/Quick Open dialogs' z-50 (the popups
 * start just 12px from the top on mobile, right under this bar) — the
 * mobile action dock needs to outrank them instead, which it does by
 * being portaled straight to `document.body` (see `AppHeader`), not by
 * this bar's own z-index. */
export const bar = cva({
	base: [
		"fixed inset-x-0 top-0 z-20 flex h-12 shrink-0 items-center gap-2.5 border-ink/10 border-b bg-canvas px-3",
		"dark:border-surface/10 dark:bg-ink",
		"sm:inset-x-3 sm:top-3 sm:h-14 sm:gap-3 sm:rounded-2xl sm:border sm:border-ink/10 sm:bg-canvas/80 sm:px-4 sm:shadow-lg sm:shadow-ink/10 sm:backdrop-blur-md sm:backdrop-saturate-150",
		"dark:sm:border-surface/15 dark:sm:bg-ink/80 dark:sm:shadow-black/30",
	],
});

export const brand = cva({
	base: "flex shrink-0 items-center gap-2 rounded-md font-serif text-xl italic outline-none focus-visible:ring-2 focus-visible:ring-danger/50",
});

/** Wraps the reused Breadcrumbs trail when a node's detail page is open. */
export const wayfinding = cva({
	base: "min-w-0 border-ink/15 border-l pl-2.5 dark:border-surface/15",
});

/** An icon-only button in the bar at sm: and up; an icon+label tile inside
 * the mobile action dock below sm:. Shared by Agenda's trigger. */
export const dockItem = cva({
	base: [
		"flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-ink/70 outline-none",
		"hover:bg-surface hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/50",
		"dark:text-surface/70 dark:hover:text-danger",
		"sm:flex-none sm:flex-row sm:rounded-md sm:p-1.5",
	],
});

/** Wraps Home/Agenda/QuickOpen/UserMenu. A fixed, floating bottom dock
 * below sm:, portaled straight to `document.body` (see `AppHeader`) so
 * its z-[60] is compared directly against the dialogs' z-50 in the same
 * top-level stacking context, rather than being capped by an ancestor's
 * lower z-index. Reverts to a plain right-aligned inline group — back
 * inside the header, no portal — at sm: and up, where z-index is a
 * no-op on the sm:static layout. */
export const actionsDock = cva({
	base: [
		"fixed inset-x-3 bottom-3 z-[60] flex items-stretch justify-around gap-1 rounded-2xl border border-ink/10 bg-canvas/90 p-1 shadow-lg shadow-ink/10 backdrop-blur-md backdrop-saturate-150",
		"dark:border-surface/15 dark:bg-ink/90 dark:shadow-black/30",
		"sm:static sm:inset-auto sm:ml-auto sm:flex sm:shrink-0 sm:items-center sm:justify-end sm:gap-1 sm:rounded-none sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none",
	],
});
