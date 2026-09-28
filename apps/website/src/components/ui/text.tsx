import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { site, siteFontSize } from "@/theme/site.stylex";

const styles = stylex.create({
	base: {
		margin: 0,
		textWrap: "pretty",
	},
	lead: {
		fontSize: siteFontSize.large,
		lineHeight: 1.6,
	},
	body: {
		fontSize: siteFontSize.lead,
		lineHeight: 1.7,
	},
	small: {
		fontSize: siteFontSize.small,
		lineHeight: 1.65,
	},
	soft: { color: site.inkSoft },
	muted: { color: site.muted },
	onDark: { color: site.onDarkSoft },
	inherit: { color: "inherit" },
});

export interface TextProps {
	children: ReactNode;
	size?: "lead" | "body" | "small";
	tone?: "soft" | "muted" | "onDark" | "inherit";
	style?: stylex.StyleXStyles;
}

/** Body copy. Newlines from CMS textareas become paragraph breaks. */
export function Text({
	children,
	size = "body",
	tone = "soft",
	style,
}: TextProps) {
	return (
		<p {...stylex.props(styles.base, styles[size], styles[tone], style)}>
			{children}
		</p>
	);
}

/** Splits a textarea value into one <Text> per paragraph. */
export function Paragraphs({
	text,
	...props
}: Omit<TextProps, "children"> & { text: string }) {
	return text
		.split(/\n{2,}/)
		.filter((chunk) => chunk.trim().length > 0)
		.map((chunk, index) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: paragraphs have no identity beyond position
			<Text key={index} {...props}>
				{chunk.trim()}
			</Text>
		));
}
