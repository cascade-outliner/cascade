import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	base: css.raw({
		margin: 0,
		fontWeight: 700,
		textWrap: "balance",
		color: "inherit",
	}),
	h1: css.raw({
		fontSize: "site.h1",
		lineHeight: 1.08,
	}),
	h2: css.raw({
		fontSize: "site.h2",
		lineHeight: 1.12,
	}),
	display: css.raw({
		fontSize: "site.display",
		lineHeight: 1.08,
	}),
	h3: css.raw({
		fontSize: "site.h3",
		lineHeight: 1.3,
		fontWeight: 600,
	}),
};

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
		<Tag id={id} className={css(styles.base, styles[size ?? as], cssProp)}>
			{children}
		</Tag>
	);
}
