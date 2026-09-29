import { byOrder } from "../util/order.ts";
import { textState } from "./content.ts";
import type { OutlineStore } from "./store.ts";

/**
 * Daily nodes live at `Daily nodes > 2026 > September > Sunday, 27th`,
 * oldest first (calendar order) at every level. Ids are fixed (`daily`, `daily-2026`,
 * `daily-2026-09`, `daily-2026-09-27`), so every device creates the same nodes,
 * and they sort chronologically.
 */
export const DAILY_ROOT = "daily";
const PREFIX = `${DAILY_ROOT}-`;
const DAY = /^daily-\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` for `date`'s local calendar day, the format of `Node.due`. */
export function isoDay(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `daily-YYYY-MM-DD` for `date`'s local calendar day. */
export function dayId(date: Date): string {
	return PREFIX + isoDay(date);
}

export function isDayId(id: string): boolean {
	return DAY.test(id);
}

/** The daily root, a year, a month or a day: fixed nodes, see `OutlineStore.isLocked`. */
export function isDailyNode(id: string): boolean {
	return id === DAILY_ROOT || id.startsWith(PREFIX);
}

/** The local date a day id stands for. */
export function dayDate(id: string): Date {
	return fromIsoDay(id.slice(PREFIX.length));
}

/** The local date a `YYYY-MM-DD` day stands for; the inverse of `isoDay`. */
export function fromIsoDay(day: string): Date {
	const [y, m, d] = day.split("-").map(Number);
	return new Date(y, m - 1, d);
}

/**
 * Creates `id` under `parentId` if missing, in date order among its daily
 * siblings: before the first later one, else right after the last one, else last.
 */
function ensure(
	store: OutlineStore,
	id: string,
	parentId: string | null,
	text: string,
): string {
	if (store.get(id)) {
		return id;
	}
	// ponytail: scans every node; fine until outlines reach six figures, then expose the store's children index.
	const siblings = [...store.nodes.values()]
		.filter((node) => node.parentId === parentId)
		.sort(byOrder);
	let index = siblings.length;
	for (const [at, node] of siblings.entries()) {
		if (!isDailyNode(node.id)) continue;
		if (node.id > id) {
			index = at;
			break;
		}
		index = at + 1;
	}
	return store.create(parentId, {
		id,
		index,
		content: textState(text),
	});
}

/** `date`'s note, created (with its month, year and the root) if missing. Returns its id. */
export function openDay(store: OutlineStore, date: Date): string {
	const year = `${PREFIX}${date.getFullYear()}`;
	const month = `${year}-${pad(date.getMonth() + 1)}`;
	ensure(store, DAILY_ROOT, null, "Daily nodes");
	ensure(store, year, DAILY_ROOT, String(date.getFullYear()));
	ensure(
		store,
		month,
		year,
		date.toLocaleDateString("en-US", { month: "long" }),
	);
	return ensure(store, dayId(date), month, dayTitle(date));
}

/** `daily-YYYY` for a year's node. */
export const yearId = (year: number) => `${PREFIX}${year}`;

/** `daily-YYYY-MM` for a month's node; `month` is 0-based like `Date`. */
export const monthId = (year: number, month: number) =>
	`${yearId(year)}-${pad(month + 1)}`;

/** A year's node, created (with the root) if missing. Returns its id. */
export function openYear(store: OutlineStore, year: number): string {
	ensure(store, DAILY_ROOT, null, "Daily nodes");
	return ensure(store, yearId(year), DAILY_ROOT, String(year));
}

/** A month's node, created (with its year and the root) if missing. Returns its id. */
export function openMonth(
	store: OutlineStore,
	year: number,
	month: number,
): string {
	openYear(store, year);
	return ensure(
		store,
		monthId(year, month),
		yearId(year),
		new Date(year, month).toLocaleDateString("en-US", { month: "long" }),
	);
}

const SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd" };
const ordinals = new Intl.PluralRules("en-US", { type: "ordinal" });

/** "Monday, 28th": the day's title. Its month and year are its ancestors. */
export function dayTitle(date: Date): string {
	const day = date.getDate();
	const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
	return `${weekday}, ${day}${SUFFIX[ordinals.select(day)] ?? "th"}`;
}

const RELATIVE = [
	[-1, "Yesterday"],
	[0, "Today"],
	[1, "Tomorrow"],
] as const;

/** "Today", "Yesterday" or "Tomorrow" when `id` is one of those days' notes, else `null`. Shown in place of the stored title. */
export function relativeDay(id: string, now = new Date()): string | null {
	if (!isDayId(id)) {
		return null;
	}
	const hit = RELATIVE.find(([by]) => dayId(shiftDay(null, by, now)) === id);
	return hit?.[1] ?? null;
}

/** The switcher label: `relativeDay`, else a short date ("Sep 30"). `null` when `id` isn't a day note. */
export function dayLabel(id: string, now = new Date()): string | null {
	if (!isDayId(id)) {
		return null;
	}
	return (
		relativeDay(id, now) ??
		dayDate(id).toLocaleDateString("en-US", { month: "short", day: "numeric" })
	);
}

/** The date `by` days from `id`'s day, or from `now` when `id` isn't a day note. */
export function shiftDay(
	id: string | null,
	by: number,
	now = new Date(),
): Date {
	const base = id && isDayId(id) ? dayDate(id) : now;
	return new Date(base.getFullYear(), base.getMonth(), base.getDate() + by);
}

/** A due date's label: "Today", "Tomorrow", "Yesterday", else a short date ("Sep 30"). */
export function dueLabel(due: string, now = new Date()): string {
	return dayLabel(PREFIX + due, now) ?? due;
}
