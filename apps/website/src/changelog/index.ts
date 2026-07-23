import { marked } from "marked";
import raw from "../../../../CHANGELOG.md?raw";

export type ChangelogItemType = "feat" | "fix" | "chore";

const ITEM_TYPES: readonly ChangelogItemType[] = ["feat", "fix", "chore"];

const ITEM_TYPE_PATTERN = /^\[(\w+)\]\s*/;

export interface ChangelogItem {
	type: ChangelogItemType | null;
	html: string;
}

export interface ChangelogEntry {
	id: string;
	items: ChangelogItem[];
}

function parseItem(line: string): ChangelogItem {
	const text = line.slice(2);
	const match = text.match(ITEM_TYPE_PATTERN);
	const type = ITEM_TYPES.find((t) => t === match?.[1]) ?? null;
	const rest = match && type ? text.slice(match[0].length) : text;
	return { type, html: marked.parseInline(rest, { async: false }) };
}

function parseChangelog(source: string): ChangelogEntry[] {
	return source
		.split(/^## /m)
		.slice(1)
		.map((section) => {
			const newlineIndex = section.indexOf("\n");
			const id = section.slice(0, newlineIndex).trim();
			const body = section.slice(newlineIndex + 1);
			const items = body
				.split("\n")
				.filter((line) => line.startsWith("- "))
				.map(parseItem);
			return { id, items };
		});
}

export const changelogEntries = parseChangelog(raw);
