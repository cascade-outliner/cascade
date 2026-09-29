import { plainText } from "./content.ts";
import type { Node } from "./types.ts";

const TAG = /(?<![\p{L}\p{N}_#])#([\p{L}\p{N}_]+)/gu;

/** The lowercased `#tag`s in `text`, without the `#`, de-duplicated. */
export function extractTags(text: string): string[] {
	return [...new Set([...text.matchAll(TAG)].map((m) => m[1].toLowerCase()))];
}

/** Every tag used in `nodes` with its node count, most used first. */
export function tagCounts(
	nodes: Iterable<Node>,
): [tag: string, count: number][] {
	const counts = new Map<string, number>();
	for (const node of nodes) {
		for (const tag of extractTags(plainText(node.content))) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}
	return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
