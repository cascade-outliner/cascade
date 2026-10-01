import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	eyebrow: css.raw({
		display: "block",
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		textTransform: "uppercase",
		lineHeight: 1.4,
	}),
	primary: css.raw({ color: "site.primary" }),
	muted: css.raw({ color: "site.muted" }),
	onDark: css.raw({ color: "site.onDarkMuted" }),
};

export interface EyebrowProps {
	children: ReactNode;
	tone?: "primary" | "muted" | "onDark";
	css?: SystemStyleObject;
}

/** The small mono label that sits above a heading. */
export function Eyebrow({
	children,
	tone = "primary",
	css: cssProp,
}: EyebrowProps) {
	return (
		<span className={css(styles.eyebrow, styles[tone], cssProp)}>
			{children}
		</span>
	);
}
