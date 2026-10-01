import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const eyebrow = cva({
	base: {
		display: "block",
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		textTransform: "uppercase",
		lineHeight: "label",
	},
	variants: {
		tone: {
			primary: { color: "site.primary" },
			muted: { color: "site.muted" },
			onDark: { color: "site.onDarkMuted" },
		},
	},
});

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
		<span className={css(eyebrow.raw({ tone }), cssProp)}>{children}</span>
	);
}
