import { radius } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { site, siteShadow } from "@/theme/site.stylex";

const styles = stylex.create({
	card: {
		display: "flex",
		flexDirection: "column",
		borderRadius: "18px",
	},
	paper: {
		backgroundColor: site.card,
		color: site.ink,
		boxShadow: siteShadow.card,
	},
	dark: {
		backgroundColor: site.ink,
		color: site.onDark,
	},
	tint: {
		backgroundColor: site.tint,
		color: site.ink,
	},
	raised: {
		backgroundColor: site.card,
		color: site.ink,
		boxShadow: siteShadow.lift,
	},
	padded: {
		padding: "1.375rem",
	},
	roomy: {
		padding: "2rem",
		borderRadius: "22px",
	},
	rounded: {
		borderRadius: radius.lg,
	},
});

export interface CardProps {
	children: ReactNode;
	tone?: "paper" | "dark" | "tint" | "raised";
	padding?: "none" | "padded" | "roomy";
	as?: "div" | "article" | "li";
	style?: stylex.StyleXStyles;
}

export function Card({
	children,
	tone = "paper",
	padding = "padded",
	as: Tag = "div",
	style,
}: CardProps) {
	return (
		<Tag
			{...stylex.props(
				styles.card,
				styles[tone],
				padding !== "none" && styles[padding],
				style,
			)}
		>
			{children}
		</Tag>
	);
}
