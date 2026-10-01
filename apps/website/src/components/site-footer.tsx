import type { Footer } from "@/payload-types";
import { css } from "@/styled-system/css";
import { Container } from "./ui/container";

const styles = {
	footer: css({
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "space-between",
		alignItems: "center",
		rowGap: "site.3",
		columnGap: "site.5.5",
		paddingBlock: "site.6.5",
		fontFamily: "mono",
		fontSize: "site.eyebrow",
		fontWeight: 500,
		color: "site.muted",
	}),
	links: css({
		display: "flex",
		flexWrap: "wrap",
		gap: "site.5.5",
		listStyle: "none",
		margin: "0",
		padding: "0",
		width: { base: "auto", _mobile: "full" },
	}),
	link: css({
		color: { base: "site.muted", _hover: "site.ink" },
		textDecoration: "none",
		borderRadius: "sm",
		outline: "none",
		boxShadow: { base: "none", _focusVisible: "focusRing" },
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
