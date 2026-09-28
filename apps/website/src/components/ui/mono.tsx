import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { site, siteFontSize } from "@/theme/site.stylex";

const styles = stylex.create({
	mono: {
		fontFamily: fonts.mono,
		fontSize: siteFontSize.eyebrow,
		fontWeight: 500,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
	},
	muted: { color: site.muted },
	primary: { color: site.primary },
	onDark: { color: site.onDarkMuted },
	inherit: { color: "inherit" },
});

export interface MonoProps {
	children: ReactNode;
	tone?: "muted" | "primary" | "onDark" | "inherit";
	style?: stylex.StyleXStyles;
}

/** Small monospace text for hints, fine print and labels inside illustrations. */
export function Mono({ children, tone = "muted", style }: MonoProps) {
	return (
		<span {...stylex.props(styles.mono, styles[tone], style)}>{children}</span>
	);
}
