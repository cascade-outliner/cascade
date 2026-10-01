import type { ReactNode } from "react";
import { css, cva } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const buttonLink = cva({
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "site.2",
		fontWeight: 600,
		lineHeight: "snug",
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: "lg",
		transitionProperty: "[background-color, color, box-shadow, transform]",
		transitionDuration: "150",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
	},
	variants: {
		size: {
			md: {
				fontSize: "site.small",
				paddingBlock: "site.2.5",
				paddingInline: "site.4.5",
			},
			lg: {
				fontSize: "site.body",
				paddingBlock: "site.3.5",
				paddingInline: "site.6",
				borderRadius: "lg",
			},
		},
		variant: {
			primary: {
				backgroundColor: { base: "site.primary", _hover: "site.primaryHover" },
				color: "site.onPrimary",
			},
			dark: {
				backgroundColor: { base: "site.ink", _hover: "site.inkSoft" },
				color: "site.onDark",
			},
			light: {
				backgroundColor: { base: "site.card", _hover: "site.onPrimary" },
				color: "site.ink",
			},
			outline: {
				backgroundColor: { base: "transparent", _hover: "site.tint" },
				color: "site.ink",
				boxShadow: {
					base: "site.outlineInk",
					_focusVisible:
						"[token(shadows.site.outlineInk), token(shadows.focusRing)]",
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
				width: "full",
				paddingBlock: "site.3.5",
			},
		},
		/** Stretch to the parent's width on phones only. */
		fullOnMobile: {
			true: {
				width: { _mobile: "full" },
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
