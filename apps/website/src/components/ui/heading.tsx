import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { siteFontSize } from "@/theme/site.stylex";

const styles = stylex.create({
	base: {
		margin: 0,
		fontWeight: 700,
		textWrap: "balance",
		color: "inherit",
	},
	h1: {
		fontSize: siteFontSize.h1,
		lineHeight: 1.08,
	},
	h2: {
		fontSize: siteFontSize.h2,
		lineHeight: 1.12,
	},
	display: {
		fontSize: siteFontSize.display,
		lineHeight: 1.08,
	},
	h3: {
		fontSize: siteFontSize.h3,
		lineHeight: 1.3,
		fontWeight: 600,
	},
});

type Level = "h1" | "h2" | "h3";

export interface HeadingProps {
	/** The HTML element, which also picks the default size. */
	as: Level;
	/** Override the size without changing the element's level. */
	size?: Level | "display";
	id?: string;
	children: ReactNode;
	style?: stylex.StyleXStyles;
}

/** A heading whose visual size is decoupled from its document level. */
export function Heading({ as, size, id, children, style }: HeadingProps) {
	const Tag = as;
	return (
		<Tag id={id} {...stylex.props(styles.base, styles[size ?? as], style)}>
			{children}
		</Tag>
	);
}
