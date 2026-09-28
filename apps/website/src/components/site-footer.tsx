import { fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { Footer } from "@/payload-types";
import { media } from "@/theme/breakpoints.stylex";
import { site, siteFontSize, siteShadow } from "@/theme/site.stylex";
import { Container } from "./ui/container";

const styles = stylex.create({
	footer: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "space-between",
		alignItems: "center",
		gap: "0.75rem 1.375rem",
		paddingBlock: "1.625rem",
		fontFamily: fonts.mono,
		fontSize: siteFontSize.eyebrow,
		fontWeight: 500,
		color: site.muted,
	},
	links: {
		display: "flex",
		flexWrap: "wrap",
		gap: "1.375rem",
		listStyle: "none",
		margin: 0,
		padding: 0,
		width: { default: "auto", [media.mobile]: "100%" },
	},
	link: {
		color: { default: site.muted, ":hover": site.ink },
		textDecoration: "none",
		borderRadius: "4px",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": siteShadow.focus },
	},
});

export interface SiteFooterProps {
	footer: Footer;
}

export function SiteFooter({ footer }: SiteFooterProps) {
	const links = footer.links ?? [];
	return (
		<Container>
			<footer {...stylex.props(styles.footer)}>
				<span>
					© {new Date().getFullYear()} {footer.copyright}
				</span>
				{links.length > 0 && (
					<nav aria-label="Footer">
						<ul {...stylex.props(styles.links)}>
							{links.map((link) => (
								<li key={link.id ?? link.url}>
									<a href={link.url} {...stylex.props(styles.link)}>
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
