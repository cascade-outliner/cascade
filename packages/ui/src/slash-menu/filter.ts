/** What every slash menu entry needs; consumers extend it with what to do on select. */
export interface SlashMenuItem {
	id: string;
	label: string;
	/** Items are shown under this heading, in the order they are given. */
	group: string;
	/** Extra words the item matches on, e.g. "todo" for "Turn into task". */
	keywords?: string[];
	/** A second, quieter line under the label. */
	description?: string;
	icon?: React.ReactNode;
	/** Styled as destructive, e.g. "Delete". */
	danger?: boolean;
}

export interface SlashMenuGroup<T extends SlashMenuItem> {
	label: string;
	items: T[];
}

/** Lower is better. `null` means no match. */
function rankOf(item: SlashMenuItem, query: string): number | null {
	const label = item.label.toLowerCase();
	if (label.startsWith(query)) return 0;
	const words = [...label.split(/\s+/), ...(item.keywords ?? [])];
	if (words.some((word) => word.toLowerCase().startsWith(query))) return 1;
	return null;
}

/**
 * The items whose label, a word of it, or a keyword starts with `query`.
 * Groups stay together, ordered by their best match; within a group, label
 * prefixes come first, then the given order. An empty query keeps everything.
 */
export function filterSlashMenuItems<T extends SlashMenuItem>(
	items: readonly T[],
	query: string,
): T[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return [...items];

	const matches: { item: T; rank: number; index: number }[] = [];
	const groupRank = new Map<string, number>();
	items.forEach((item, index) => {
		const rank = rankOf(item, needle);
		if (rank === null) return;
		matches.push({ item, rank, index });
		groupRank.set(
			item.group,
			Math.min(rank, groupRank.get(item.group) ?? Number.POSITIVE_INFINITY),
		);
	});

	const groupOrder = [...groupRank.keys()];
	const byGroup = (a: T, b: T) =>
		(groupRank.get(a.group) as number) - (groupRank.get(b.group) as number) ||
		groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);

	return matches
		.sort(
			(a, b) => byGroup(a.item, b.item) || a.rank - b.rank || a.index - b.index,
		)
		.map(({ item }) => item);
}

/** Splits an ordered list into runs of the same `group`, keeping their order. */
export function groupSlashMenuItems<T extends SlashMenuItem>(
	items: readonly T[],
): SlashMenuGroup<T>[] {
	const groups: SlashMenuGroup<T>[] = [];
	for (const item of items) {
		const last = groups.at(-1);
		if (last?.label === item.group) {
			last.items.push(item);
		} else {
			groups.push({ label: item.group, items: [item] });
		}
	}
	return groups;
}
