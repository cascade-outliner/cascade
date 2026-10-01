import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const buttonLink = cva({
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "0.5rem",
		fontWeight: 600,
		lineHeight: 1.2,
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: "lg",
		transitionProperty: "background-color, color, box-shadow, transform",
		transitionDuration: "150ms",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	},
	variants: {
		size: {
			md: {
				fontSize: "site.small",
				paddingBlock: "0.625rem",
				paddingInline: "1.125rem",
			},
			lg: {
				fontSize: "site.body",
				paddingBlock: "0.875rem",
				paddingInline: "1.5rem",
				borderRadius: "lg",
			},
		},
		variant: {
			primary: {
				backgroundColor: { base: "site.primary", _hover: "site.primaryHover" },
				color: "#ffffff",
			},
			dark: {
				backgroundColor: { base: "site.ink", _hover: "site.inkSoft" },
				color: "site.onDark",
			},
			light: {
				backgroundColor: { base: "site.card", _hover: "#ffffff" },
				color: "site.ink",
			},
			outline: {
				backgroundColor: { base: "transparent", _hover: "site.tint" },
				color: "site.ink",
				boxShadow: {
					base: "inset 0 0 0 1.5px token(colors.site.ink)",
					_focusVisible:
						"inset 0 0 0 1.5px token(colors.site.ink), token(shadows.site.focus)",
				},
			},
			ghost: {
				backgroundColor: { base: "transparent", _hover: "site.tint" },
				color: "site.ink",
				fontWeight: 400,
			},
		},
		/** Stretch to the parent's width. */
		block: {
			true: {
				width: "100%",
				paddingBlock: "0.8125rem",
			},
		},
		/** Stretch to the parent's width on phones only. */
		fullOnMobile: {
			true: {
				width: { _mobile: "100%" },
			},
		},
	},
});

export type ButtonVariant = "primary" | "dark" | "light" | "outline" | "ghost";

export interface ButtonLinkProps {
	href: string;
	children: ReactNode;
	variant?: ButtonVariant;
	size?: "md" | "lg";
	/** Stretch to the parent's width. */
	block?: boolean;
	/** Stretch to the parent's width on phones only. */
	fullOnMobile?: boolean;
	newTab?: boolean | null;
	css?: SystemStyleObject;
}

function isExternal(href: string) {
	return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/** An anchor dressed as a button, for CMS-driven calls to action. */
export function ButtonLink({
	href,
	children,
	variant = "primary",
	size = "md",
	block = false,
	fullOnMobile = false,
	newTab,
	css: cssProp,
}: ButtonLinkProps) {
	const external = isExternal(href);
	const opensNewTab = Boolean(newTab);

	return (
		<a
			href={href}
			target={opensNewTab ? "_blank" : undefined}
			rel={opensNewTab || external ? "noopener noreferrer" : undefined}
			className={css(
				buttonLink.raw({ size, variant, block, fullOnMobile }),
				cssProp,
			)}
		>
			{children}
		</a>
	);
}
