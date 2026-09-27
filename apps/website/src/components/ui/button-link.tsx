import { radius } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";

const styles = stylex.create({
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "0.5rem",
		fontWeight: 600,
		lineHeight: 1.2,
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: radius.lg,
		transitionProperty: "background-color, color, box-shadow, transform",
		transitionDuration: "150ms",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
	md: {
		fontSize: siteFontSize.small,
		paddingBlock: "0.625rem",
		paddingInline: "1.125rem",
	},
	lg: {
		fontSize: siteFontSize.body,
		paddingBlock: "0.875rem",
		paddingInline: "1.5rem",
		borderRadius: radius.lg,
	},
	block: {
		width: "100%",
		paddingBlock: "0.8125rem",
	},
	primary: {
		backgroundColor: { default: site.primary, ":hover": site.primaryHover },
		color: "#ffffff",
	},
	dark: {
		backgroundColor: { default: site.ink, ":hover": site.inkSoft },
		color: site.onDark,
	},
	light: {
		backgroundColor: { default: site.card, ":hover": "#ffffff" },
		color: site.ink,
	},
	outline: {
		backgroundColor: { default: "transparent", ":hover": site.tint },
		color: site.ink,
		boxShadow: {
			default: `inset 0 0 0 1.5px ${site.ink}`,
			":focus-visible": `inset 0 0 0 1.5px ${site.ink}, ${siteShadow.focus}`,
		},
	},
	ghost: {
		backgroundColor: { default: "transparent", ":hover": site.tint },
		color: site.ink,
		fontWeight: 400,
	},
	fullOnMobile: {
		width: { default: null, [media.mobile]: "100%" },
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
	style?: stylex.StyleXStyles;
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
	style,
}: ButtonLinkProps) {
	const external = isExternal(href);
	const opensNewTab = Boolean(newTab);

	return (
		<a
			href={href}
			target={opensNewTab ? "_blank" : undefined}
			rel={opensNewTab || external ? "noopener noreferrer" : undefined}
			{...stylex.props(
				styles.base,
				styles[size],
				styles[variant],
				block && styles.block,
				fullOnMobile && styles.fullOnMobile,
				style,
			)}
		>
			{children}
		</a>
	);
}
