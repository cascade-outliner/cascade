import type { SerializedEditorState } from "lexical";
import {
	type Folded,
	fold,
	type Match,
	matchTerms,
	terms,
} from "../util/match.ts";
import { plainText } from "./content.ts";
import type { Node } from "./types.ts";

export interface SearchHit extends Match {
	node: Node;
	/** The node's plain text, which `ranges` index into. */
	text: string;
}

export interface SearchResult {
	/** The best hits, best first, at most `limit` of them. */
	hits: SearchHit[];
	/** How many nodes matched in total. */
	total: number;
}

/**
 * Plain and folded text per content state. Content is replaced wholesale on
 * every edit (never mutated), so the ref is the cache key and entries for old
 * states are dropped with them — nothing to invalidate.
 */
const texts = new WeakMap<
	SerializedEditorState,
	{ plain: string; folded: Folded }
>();

function textOf(content: SerializedEditorState) {
	let entry = texts.get(content);
	if (!entry) {
		const plain = plainText(content);
		entry = { plain, folded: fold(plain) };
		texts.set(content, entry);
	}
	return entry;
}

/**
 * Nodes whose text contains every term of `query`, best first. Ties go to the
 * shorter text (the match is more of it), then the more recently edited node.
 */
export function searchNodes(
	nodes: Iterable<Node>,
	query: string,
	limit: number,
): SearchResult {
	const queryTerms = terms(query);
	const hits: SearchHit[] = [];
	if (queryTerms.length > 0) {
		for (const node of nodes) {
			const { plain, folded } = textOf(node.content);
			const match = matchTerms(queryTerms, folded);
			if (match) {
				hits.push({ node, text: plain, ...match });
			}
		}
	}
	hits.sort(
		(a, b) =>
			b.score - a.score ||
			a.text.length - b.text.length ||
			b.node.updatedAt - a.node.updatedAt,
	);
	return { hits: hits.slice(0, limit), total: hits.length };
}
