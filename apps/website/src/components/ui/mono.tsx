import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const mono = cva({
	base: {
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		lineHeight: "label",
		whiteSpace: "nowrap",
	},
	variants: {
		tone: {
			muted: { color: "site.muted" },
			primary: { color: "site.primary" },
			onDark: { color: "site.onDarkMuted" },
			inherit: { color: "inherit" },
		},
	},
});

export interface MonoProps {
	children: ReactNode;
	tone?: "muted" | "primary" | "onDark" | "inherit";
	css?: SystemStyleObject;
}

/** Small monospace text for hints, fine print and labels inside illustrations. */
export function Mono({ children, tone = "muted", css: cssProp }: MonoProps) {
	return <span className={css(mono.raw({ tone }), cssProp)}>{children}</span>;
}
