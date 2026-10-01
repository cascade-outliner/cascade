import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const heading = cva({
	base: {
		margin: "0",
		fontWeight: 700,
		textWrap: "balance",
		color: "inherit",
	},
	variants: {
		size: {
			h1: { fontSize: "site.h1", lineHeight: "tight" },
			h2: { fontSize: "site.h2", lineHeight: "tight" },
			display: { fontSize: "site.display", lineHeight: "tight" },
			h3: { fontSize: "site.h3", lineHeight: "title", fontWeight: 600 },
		},
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
	css?: SystemStyleObject;
}

/** A heading whose visual size is decoupled from its document level. */
export function Heading({
	as,
	size,
	id,
	children,
	css: cssProp,
}: HeadingProps) {
	const Tag = as;
	return (
		<Tag id={id} className={css(heading.raw({ size: size ?? as }), cssProp)}>
			{children}
		</Tag>
	);
}
