import { marked } from "marked";

export type ChangelogItemType = "feat" | "fix" | "chore";

export interface ChangelogItem {
	type: ChangelogItemType | null;
	html: string;
}

export interface ChangelogEntry {
	id: string;
	items: ChangelogItem[];
}

const ITEM_TYPES: readonly ChangelogItemType[] = ["feat", "fix", "chore"];
const ITEM_TYPE_PATTERN = /^\[(\w+)\]\s*/;

function parseItem(line: string): ChangelogItem {
	const text = line.slice(2);
	const match = text.match(ITEM_TYPE_PATTERN);
	const type = ITEM_TYPES.find((itemType) => itemType === match?.[1]) ?? null;
	const content = match && type ? text.slice(match[0].length) : text;

	return {
		type,
		html: marked.parseInline(content, { async: false }),
	};
}

function parseSection(section: string): ChangelogEntry {
	const newlineIndex = section.indexOf("\n");
	const id = section.slice(0, newlineIndex).trim();
	const body = section.slice(newlineIndex + 1);
	const items = body
		.split("\n")
		.filter((line) => line.startsWith("- "))
		.map(parseItem);

	return { id, items };
}

export function parseChangelog(source: string): ChangelogEntry[] {
	return source.split(/^## /m).slice(1).map(parseSection);
}
