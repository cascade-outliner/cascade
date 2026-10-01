import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	base: css.raw({
		margin: 0,
		textWrap: "pretty",
	}),
	lead: css.raw({
		fontSize: "site.large",
		lineHeight: 1.6,
	}),
	body: css.raw({
		fontSize: "site.lead",
		lineHeight: 1.7,
	}),
	small: css.raw({
		fontSize: "site.small",
		lineHeight: 1.65,
	}),
	soft: css.raw({ color: "site.inkSoft" }),
	muted: css.raw({ color: "site.muted" }),
	onDark: css.raw({ color: "site.onDarkSoft" }),
	inherit: css.raw({ color: "inherit" }),
};

export interface TextProps {
	children: ReactNode;
	size?: "lead" | "body" | "small";
	tone?: "soft" | "muted" | "onDark" | "inherit";
	css?: SystemStyleObject;
}

/** Body copy. Newlines from CMS textareas become paragraph breaks. */
export function Text({
	children,
	size = "body",
	tone = "soft",
	css: cssProp,
}: TextProps) {
	return (
		<p className={css(styles.base, styles[size], styles[tone], cssProp)}>
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
