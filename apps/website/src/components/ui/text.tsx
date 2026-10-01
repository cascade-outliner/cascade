import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const text = cva({
	base: {
		margin: "0",
		textWrap: "pretty",
	},
	variants: {
		size: {
			lead: { fontSize: "site.large", lineHeight: "relaxed" },
			body: { fontSize: "site.lead", lineHeight: "loose" },
			small: { fontSize: "site.small", lineHeight: "relaxed" },
		},
		tone: {
			soft: { color: "site.inkSoft" },
			muted: { color: "site.muted" },
			onDark: { color: "site.onDarkSoft" },
			inherit: { color: "inherit" },
		},
	},
});

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
	return <p className={css(text.raw({ size, tone }), cssProp)}>{children}</p>;
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
