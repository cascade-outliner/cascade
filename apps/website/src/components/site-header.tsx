import { ListIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId, useState } from "react";
import type { Header } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";
import { ButtonLink } from "./ui/button-link";
import { Container } from "./ui/container";
import { Logo } from "./ui/logo";

const styles = stylex.create({
	header: {
		position: "relative",
		zIndex: 10,
	},
	bar: {
		display: "flex",
		alignItems: "center",
		gap: "2rem",
		paddingBlock: "1.375rem",
	},
	nav: {
		display: { default: "flex", [media.tablet]: "none" },
		gap: "1.625rem",
		marginInlineStart: "1.25rem",
		fontSize: siteFontSize.small,
	},
	navLink: {
		color: { default: site.muted, ":hover": site.ink },
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: "6px",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
		transitionProperty: "color",
		transitionDuration: "150ms",
	},
	actions: {
		marginInlineStart: "auto",
		display: { default: "flex", [media.tablet]: "none" },
		alignItems: "center",
		gap: "0.625rem",
	},
	menuButton: {
		display: { default: "none", [media.tablet]: "inline-flex" },
		marginInlineStart: "auto",
		alignItems: "center",
		justifyContent: "center",
		width: 40,
		height: 40,
		borderRadius: "10px",
		backgroundColor: { default: "transparent", ":hover": site.tint },
		color: site.ink,
		cursor: "pointer",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
	menu: {
		display: { default: "none", [media.tablet]: "flex" },
		flexDirection: "column",
		gap: "0.25rem",
		paddingBlockEnd: "1.25rem",
	},
	menuClosed: {
		display: "none",
	},
	menuLink: {
		display: "block",
		paddingBlock: "0.75rem",
		paddingInline: "0.75rem",
		borderRadius: "10px",
		fontSize: siteFontSize.large,
		fontWeight: 500,
		color: site.ink,
		textDecoration: "none",
		backgroundColor: { default: "transparent", ":hover": site.tint },
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
	menuActions: {
		display: "flex",
		flexDirection: "column",
		gap: "0.625rem",
		marginBlockStart: "0.75rem",
		paddingInline: "0.75rem",
	},
});

export interface SiteHeaderProps {
	siteName: string;
	header: Header;
}

export function SiteHeader({ siteName, header }: SiteHeaderProps) {
	const [open, setOpen] = useState(false);
	const menuId = useId();
	const navigation = header.navigation ?? [];

	return (
		<header {...stylex.props(styles.header)}>
			<Container>
				<div {...stylex.props(styles.bar)}>
					<Logo name={siteName} />
					<nav aria-label="Primary" {...stylex.props(styles.nav)}>
						{navigation.map((item) => (
							<a
								key={item.id ?? item.url}
								href={item.url}
								{...stylex.props(styles.navLink)}
							>
								{item.label}
							</a>
						))}
					</nav>
					<div {...stylex.props(styles.actions)}>
						{header.secondaryAction?.url && header.secondaryAction.label && (
							<ButtonLink
								href={header.secondaryAction.url}
								newTab={header.secondaryAction.newTab}
								variant="ghost"
							>
								{header.secondaryAction.label}
							</ButtonLink>
						)}
						<ButtonLink
							href={header.primaryAction.url}
							newTab={header.primaryAction.newTab}
							variant="dark"
						>
							{header.primaryAction.label}
						</ButtonLink>
					</div>
					<button
						type="button"
						aria-expanded={open}
						aria-controls={menuId}
						aria-label={open ? "Close menu" : "Open menu"}
						onClick={() => setOpen((value) => !value)}
						{...stylex.props(styles.menuButton)}
					>
						{open ? <XIcon size={22} /> : <ListIcon size={22} />}
					</button>
				</div>
				<nav
					id={menuId}
					aria-label="Primary"
					{...stylex.props(styles.menu, !open && styles.menuClosed)}
				>
					{navigation.map((item) => (
						<a
							key={item.id ?? item.url}
							href={item.url}
							onClick={() => setOpen(false)}
							{...stylex.props(styles.menuLink)}
						>
							{item.label}
						</a>
					))}
					<div {...stylex.props(styles.menuActions)}>
						{header.secondaryAction?.url && header.secondaryAction.label && (
							<ButtonLink
								href={header.secondaryAction.url}
								newTab={header.secondaryAction.newTab}
								variant="outline"
								block
							>
								{header.secondaryAction.label}
							</ButtonLink>
						)}
						<ButtonLink
							href={header.primaryAction.url}
							newTab={header.primaryAction.newTab}
							variant="dark"
							block
						>
							{header.primaryAction.label}
						</ButtonLink>
					</div>
				</nav>
			</Container>
		</header>
	);
}
