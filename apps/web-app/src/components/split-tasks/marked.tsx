import { phraseRanges } from "@cascade/data";
import { colors, radius } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const tint = `color-mix(in srgb, ${colors.primary} 14%, transparent)`;

const styles = stylex.create({
	// 3b: the tint on the phrases of the note tasks were pulled from.
	source: {
		backgroundColor: tint,
		borderRadius: radius.sm,
		boxShadow: `0 0 0 2px ${tint}`,
	},
});

export interface MarkedProps {
	text: string;
	phrases: string[];
	/** How the phrases look. Defaults to the source tint. */
	style?: stylex.StyleXStyles;
}

/** `text` with `phrases` wrapped in `style`. */
export function Marked({ text, phrases, style = styles.source }: MarkedProps) {
	const parts: ReactNode[] = [];
	let at = 0;
	for (const [start, end] of phraseRanges(text, phrases)) {
		parts.push(
			text.slice(at, start),
			<span key={start} {...stylex.props(style)}>
				{text.slice(start, end)}
			</span>,
		);
		at = end;
	}
	parts.push(text.slice(at));
	return parts;
}
