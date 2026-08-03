import type { ReactNode } from "react";
import { m } from "#/paraglide/messages.js";
import type { QuickOpenResult } from "@/features/quick-open/model/types";

export function Snippet({ result }: { result: QuickOpenResult }) {
	const parts: ReactNode[] = [];
	let offset = 0;
	for (const [index, range] of result.snippet.highlightRanges.entries()) {
		parts.push(result.snippet.text.slice(offset, range.start));
		parts.push(
			<mark
				key={`${range.start}-${range.end}-${index}`}
				className="rounded-sm bg-super-ginger/35 text-inherit"
			>
				{result.snippet.text.slice(range.start, range.end)}
			</mark>,
		);
		offset = range.end;
	}
	parts.push(result.snippet.text.slice(offset));

	return (
		<span>
			{result.snippet.hasPrefix ? "…" : null}
			{parts}
			{result.snippet.hasSuffix ? "…" : null}
		</span>
	);
}

export function ResultAncestors({ result }: { result: QuickOpenResult }) {
	if (result.ancestors.length === 0) {
		return <span>{m.quick_open_top_level()}</span>;
	}

	return (
		<>
			{result.ancestors.map((ancestor, index) => (
				<span key={ancestor.id} className="contents">
					{index > 0 ? <span aria-hidden="true">/</span> : null}
					{index === 1 && result.omittedAncestorCount > 0 ? (
						<>
							<span
								title={m.quick_open_omitted_ancestors({
									count: result.omittedAncestorCount,
								})}
							>
								…
							</span>
							<span aria-hidden="true">/</span>
						</>
					) : null}
					<span>{ancestor.text || m.quick_open_untitled()}</span>
				</span>
			))}
		</>
	);
}
