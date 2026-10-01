import { phraseRanges } from "@cascade/data";
import type { ReactNode } from "react";
import { css } from "#/styled-system/css";
import type { SystemStyleObject } from "#/styled-system/types";

const tint = "color-mix(in srgb, token(colors.primary) 14%, transparent)";

const styles = {
	// 3b: the tint on the phrases of the note tasks were pulled from.
	source: css.raw({
		backgroundColor: tint,
		borderRadius: "sm",
		boxShadow: `0 0 0 2px ${tint}`,
	}),
};

export interface MarkedProps {
	text: string;
	phrases: string[];
	/** How the phrases look. Defaults to the source tint. */
	css?: SystemStyleObject;
}

/** `text` with `phrases` wrapped in `css`. */
export function Marked({
	text,
	phrases,
	css: cssProp = styles.source,
}: MarkedProps) {
	const parts: ReactNode[] = [];
	let at = 0;
	for (const [start, end] of phraseRanges(text, phrases)) {
		parts.push(
			text.slice(at, start),
			<span key={start} className={css(cssProp)}>
				{text.slice(start, end)}
			</span>,
		);
		at = end;
	}
	parts.push(text.slice(at));
	return parts;
}
