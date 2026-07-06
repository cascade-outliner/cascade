import type { ReactNode } from "react";

const MARK_TOKEN = /(<mark>|<\/mark>)/;

/**
 * Renders a `ts_headline` snippet as plain text segments, wrapping the
 * literal `<mark>`/`</mark>` tokens Postgres inserts around matches in a real
 * `<mark>` element. Never uses `dangerouslySetInnerHTML`: `ts_headline`
 * doesn't escape the surrounding text, so a node containing a literal `<`
 * would otherwise be unsafe to inject as raw HTML.
 */
export function HighlightedSnippet({ snippet }: { snippet: string }) {
	const parts = snippet.split(MARK_TOKEN);
	let marked = false;
	const nodes: ReactNode[] = [];

	for (const part of parts) {
		if (part === "<mark>") {
			marked = true;
			continue;
		}
		if (part === "</mark>") {
			marked = false;
			continue;
		}
		if (part === "") continue;
		nodes.push(
			marked ? (
				<mark
					key={nodes.length}
					className="rounded-sm bg-redleather/20 text-inherit dark:bg-redleather/30"
				>
					{part}
				</mark>
			) : (
				<span key={nodes.length}>{part}</span>
			),
		);
	}

	return <>{nodes}</>;
}
