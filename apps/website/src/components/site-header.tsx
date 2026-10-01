import { ListIcon, XIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import type { Header } from "@/payload-types";
import { css, cva } from "@/styled-system/css";
import { ButtonLink } from "./ui/button-link";
import { Container } from "./ui/container";
import { Logo } from "./ui/logo";

const styles = {
	header: css({
		position: "relative",
		zIndex: "header",
	}),
	bar: css({
		display: "flex",
		alignItems: "center",
		gap: "site.8",
		paddingBlock: "site.5.5",
	}),
	nav: css({
		display: { base: "flex", _tablet: "none" },
		gap: "site.6.5",
		marginInlineStart: "site.5",
		fontSize: "site.small",
	}),
	navLink: css({
		color: { base: "site.muted", _hover: "site.ink" },
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: "site.control",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
		transitionProperty: "[color]",
		transitionDuration: "150",
	}),
	actions: css({
		marginInlineStart: "auto",
		display: { base: "flex", _tablet: "none" },
		alignItems: "center",
		gap: "site.2.5",
	}),
	menuButton: css({
		display: { base: "none", _tablet: "inline-flex" },
		marginInlineStart: "auto",
		alignItems: "center",
		justifyContent: "center",
		width: "control.3xl",
		height: "control.3xl",
		borderRadius: "site.pill",
		backgroundColor: { base: "transparent", _hover: "site.tint" },
		color: "site.ink",
		cursor: "pointer",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
	}),
	menuLink: css({
		display: "block",
		paddingBlock: "site.3",
		paddingInline: "site.3",
		borderRadius: "site.pill",
		fontSize: "site.large",
		fontWeight: 500,
		color: "site.ink",
		textDecoration: "none",
		backgroundColor: { base: "transparent", _hover: "site.tint" },
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
	}),
	menuActions: css({
		display: "flex",
		flexDirection: "column",
		gap: "site.2.5",
		marginBlockStart: "site.3",
		paddingInline: "site.3",
	}),
};

const menu = cva({
	base: {
		display: { base: "none", _tablet: "flex" },
		flexDirection: "column",
		gap: "site.1",
		paddingBlockEnd: "site.5",
	},
	variants: {
		open: {
			false: { display: "none" },
		},
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
		<header className={styles.header}>
			<Container>
				<div className={styles.bar}>
					<Logo name={siteName} />
					<nav aria-label="Primary" className={styles.nav}>
						{navigation.map((item) => (
							<a
								key={item.id ?? item.url}
								href={item.url}
								className={styles.navLink}
							>
								{item.label}
							</a>
						))}
					</nav>
					<div className={styles.actions}>
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
						className={styles.menuButton}
					>
						{open ? <XIcon size={22} /> : <ListIcon size={22} />}
					</button>
				</div>
				<nav id={menuId} aria-label="Primary" className={menu({ open })}>
					{navigation.map((item) => (
						<a
							key={item.id ?? item.url}
							href={item.url}
							onClick={() => setOpen(false)}
							className={styles.menuLink}
						>
							{item.label}
						</a>
					))}
					<div className={styles.menuActions}>
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
