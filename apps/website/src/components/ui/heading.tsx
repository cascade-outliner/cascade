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
		lineHeight: 0.98,
		letterSpacing: "-0.04em",
	},
	h2: {
		fontSize: siteFontSize.h2,
		lineHeight: 1.05,
		letterSpacing: "-0.03em",
	},
	display: {
		fontSize: siteFontSize.display,
		lineHeight: 1,
		letterSpacing: "-0.04em",
	},
	h3: {
		fontSize: siteFontSize.h3,
		lineHeight: 1.2,
		fontWeight: 600,
		letterSpacing: "-0.01em",
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
