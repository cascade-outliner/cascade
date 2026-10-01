import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	mono: css.raw({
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
	}),
	muted: css.raw({ color: "site.muted" }),
	primary: css.raw({ color: "site.primary" }),
	onDark: css.raw({ color: "site.onDarkMuted" }),
	inherit: css.raw({ color: "inherit" }),
};

export interface MonoProps {
	children: ReactNode;
	tone?: "muted" | "primary" | "onDark" | "inherit";
	css?: SystemStyleObject;
}

/** Small monospace text for hints, fine print and labels inside illustrations. */
export function Mono({ children, tone = "muted", css: cssProp }: MonoProps) {
	return (
		<span className={css(styles.mono, styles[tone], cssProp)}>{children}</span>
	);
}
