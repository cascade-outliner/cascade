import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const card = cva({
	base: {
		display: "flex",
		flexDirection: "column",
		borderRadius: "18px",
	},
	variants: {
		tone: {
			paper: {
				backgroundColor: "site.card",
				color: "site.ink",
				boxShadow: "site.card",
			},
			dark: {
				backgroundColor: "site.ink",
				color: "site.onDark",
			},
			tint: {
				backgroundColor: "site.tint",
				color: "site.ink",
			},
			raised: {
				backgroundColor: "site.card",
				color: "site.ink",
				boxShadow: "site.lift",
			},
		},
		padding: {
			none: {},
			padded: { padding: "1.375rem" },
			roomy: { padding: "2rem", borderRadius: "22px" },
		},
	},
});

export interface CardProps {
	children: ReactNode;
	tone?: "paper" | "dark" | "tint" | "raised";
	padding?: "none" | "padded" | "roomy";
	as?: "div" | "article" | "li";
	css?: SystemStyleObject;
}

export function Card({
	children,
	tone = "paper",
	padding = "padded",
	as: Tag = "div",
	css: cssProp,
}: CardProps) {
	return (
		<Tag className={css(card.raw({ tone, padding }), cssProp)}>{children}</Tag>
	);
}
