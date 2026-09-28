import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";
import { site } from "@/theme/site.stylex";

const styles = stylex.create({
	link: {
		color: site.primary,
	},
	onDark: {
		color: "inherit",
		textDecoration: "underline",
		textUnderlineOffset: "3px",
	},
});

const WIKI_LINK = /\[\[([^\]]+)\]\]/g;

export interface WikiTextProps {
	text: string;
	tone?: "primary" | "onDark";
}

/** Renders `[[double bracket]]` references the way the app does: tinted, brackets kept. */
export function WikiText({ text, tone = "primary" }: WikiTextProps) {
	const parts = text.split(WIKI_LINK);
	return (
		<>
			{parts.map((part, index) =>
				index % 2 === 1 ? (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: static text, order is identity
						key={index}
						{...stylex.props(styles.link, tone === "onDark" && styles.onDark)}
					>
						[[{part}]]
					</span>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: static text, order is identity
					<Fragment key={index}>{part}</Fragment>
				),
			)}
		</>
	);
}
