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
		zIndex: 10,
	}),
	bar: css({
		display: "flex",
		alignItems: "center",
		gap: "2rem",
		paddingBlock: "1.375rem",
	}),
	nav: css({
		display: { base: "flex", _tablet: "none" },
		gap: "1.625rem",
		marginInlineStart: "1.25rem",
		fontSize: "site.small",
	}),
	navLink: css({
		color: { base: "site.muted", _hover: "site.ink" },
		textDecoration: "none",
		whiteSpace: "nowrap",
		borderRadius: "6px",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
		transitionProperty: "color",
		transitionDuration: "150ms",
	}),
	actions: css({
		marginInlineStart: "auto",
		display: { base: "flex", _tablet: "none" },
		alignItems: "center",
		gap: "0.625rem",
	}),
	menuButton: css({
		display: { base: "none", _tablet: "inline-flex" },
		marginInlineStart: "auto",
		alignItems: "center",
		justifyContent: "center",
		width: "40px",
		height: "40px",
		borderRadius: "10px",
		backgroundColor: { base: "transparent", _hover: "site.tint" },
		color: "site.ink",
		cursor: "pointer",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	}),
	menuLink: css({
		display: "block",
		paddingBlock: "0.75rem",
		paddingInline: "0.75rem",
		borderRadius: "10px",
		fontSize: "site.large",
		fontWeight: 500,
		color: "site.ink",
		textDecoration: "none",
		backgroundColor: { base: "transparent", _hover: "site.tint" },
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	}),
	menuActions: css({
		display: "flex",
		flexDirection: "column",
		gap: "0.625rem",
		marginBlockStart: "0.75rem",
		paddingInline: "0.75rem",
	}),
};

const menu = cva({
	base: {
		display: { base: "none", _tablet: "flex" },
		flexDirection: "column",
		gap: "0.25rem",
		paddingBlockEnd: "1.25rem",
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
