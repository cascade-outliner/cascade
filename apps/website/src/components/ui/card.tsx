import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	card: css.raw({
		display: "flex",
		flexDirection: "column",
		borderRadius: "18px",
	}),
	paper: css.raw({
		backgroundColor: "site.card",
		color: "site.ink",
		boxShadow: "site.card",
	}),
	dark: css.raw({
		backgroundColor: "site.ink",
		color: "site.onDark",
	}),
	tint: css.raw({
		backgroundColor: "site.tint",
		color: "site.ink",
	}),
	raised: css.raw({
		backgroundColor: "site.card",
		color: "site.ink",
		boxShadow: "site.lift",
	}),
	padded: css.raw({
		padding: "1.375rem",
	}),
	roomy: css.raw({
		padding: "2rem",
		borderRadius: "22px",
	}),
	rounded: css.raw({
		borderRadius: "lg",
	}),
};

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
		<Tag
			className={css(
				styles.card,
				styles[tone],
				padding !== "none" && styles[padding],
				cssProp,
			)}
		>
			{children}
		</Tag>
	);
}
