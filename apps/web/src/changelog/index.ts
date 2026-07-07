import { marked } from "marked";
import raw from "../../../../CHANGELOG.md?raw";

export interface ChangelogEntry {
	id: string;
	html: string;
}

function parseChangelog(source: string): ChangelogEntry[] {
	return source
		.split(/^## /m)
		.slice(1)
		.map((section) => {
			const newlineIndex = section.indexOf("\n");
			const id = section.slice(0, newlineIndex).trim();
			const body = section.slice(newlineIndex + 1);
			return { id, html: marked.parse(body, { async: false }) };
		});
}

export const changelogEntries = parseChangelog(raw);
