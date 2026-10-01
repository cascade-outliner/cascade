import type { Footer } from "@/payload-types";
import { css } from "@/styled-system/css";
import { Container } from "./ui/container";

const styles = {
	footer: css({
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "space-between",
		alignItems: "center",
		gap: "0.75rem 1.375rem",
		paddingBlock: "1.625rem",
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		color: "site.muted",
	}),
	links: css({
		display: "flex",
		flexWrap: "wrap",
		gap: "1.375rem",
		listStyle: "none",
		margin: 0,
		padding: 0,
		width: { base: "auto", _mobile: "100%" },
	}),
	link: css({
		color: { base: "site.muted", _hover: "site.ink" },
		textDecoration: "none",
		borderRadius: "4px",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "site.focus" },
	}),
};

export interface SiteFooterProps {
	footer: Footer;
}

export function SiteFooter({ footer }: SiteFooterProps) {
	const links = footer.links ?? [];
	return (
		<Container>
			<footer className={styles.footer}>
				<span>
					© {new Date().getFullYear()} {footer.copyright}
				</span>
				{links.length > 0 && (
					<nav aria-label="Footer">
						<ul className={styles.links}>
							{links.map((link) => (
								<li key={link.id ?? link.url}>
									<a href={link.url} className={styles.link}>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				)}
			</footer>
		</Container>
	);
}
