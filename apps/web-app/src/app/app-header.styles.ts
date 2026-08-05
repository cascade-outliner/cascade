import { cva } from "@cascade/ui/cva.config";

/** Flush/opaque strip on narrow viewports; an inset floating pill (blurred,
 * bordered, shadowed) at sm: and up, replacing the old full-width fade.
 * z-[60] (not z-20) because the mobile action dock lives inside this
 * element: z-index only ranks siblings within the same stacking context,
 * so a high z-index on the dock alone can't out-rank the Agenda/Quick
 * Open dialogs' z-50 backdrop+popup — the header itself, as their common
 * ancestor's stacking context, has to outrank them. */
export const bar = cva({
	base: [
		"fixed inset-x-0 top-0 z-[60] flex h-12 shrink-0 items-center gap-2.5 border-ink/10 border-b bg-canvas px-3",
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
 * below sm: (the z-[60] here matters within the header's own stacking
 * context; see `bar`'s comment for why the header itself also needs
 * z-[60] for the dock to actually outrank the dialogs). Reverts to a
 * plain right-aligned inline group at sm: and up, where z-index is a
 * no-op on the sm:static layout. */
export const actionsDock = cva({
	base: [
		"fixed inset-x-3 bottom-3 z-[60] flex items-stretch justify-around gap-1 rounded-2xl border border-ink/10 bg-canvas/90 p-1 shadow-lg shadow-ink/10 backdrop-blur-md backdrop-saturate-150",
		"dark:border-surface/15 dark:bg-ink/90 dark:shadow-black/30",
		"sm:static sm:inset-auto sm:ml-auto sm:flex sm:shrink-0 sm:items-center sm:justify-end sm:gap-1 sm:rounded-none sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none",
	],
});
