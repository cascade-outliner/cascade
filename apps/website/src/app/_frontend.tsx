/// <reference types="vite/client" />

import * as stylex from "@stylexjs/stylex";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site, siteFont, siteShadow } from "@/theme/site.stylex";
import { getSiteChrome } from "./_frontend/page.functions";
import styles from "./_frontend/styles.css?url";

export const Route = createFileRoute("/_frontend")({
	component: FrontendLayout,
	// Header and footer ride along in router context so page loaders can reuse them.
	beforeLoad: async () => ({ chrome: await getSiteChrome() }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#ad4c4e" },
		],
		links: [
			{ rel: "stylesheet", href: styles },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		],
	}),
});

const shell = stylex.create({
	page: {
		minHeight: "100vh",
		display: "flex",
		flexDirection: "column",
		backgroundColor: site.canvas,
		color: site.ink,
		fontFamily: siteFont.sans,
		colorScheme: "light",
		WebkitFontSmoothing: "antialiased",
	},
	main: {
		flex: 1,
		outline: "none",
	},
	skip: {
		position: "absolute",
		insetInlineStart: "1rem",
		top: "-100%",
		zIndex: 100,
		paddingBlock: "0.5rem",
		paddingInline: "0.875rem",
		borderRadius: "8px",
		backgroundColor: site.ink,
		color: site.onDark,
		textDecoration: "none",
		fontWeight: 600,
		":focus": {
			top: "1rem",
			boxShadow: siteShadow.focus,
			outline: "none",
		},
	},
});

function FrontendLayout() {
	const { chrome } = Route.useRouteContext();

	return (
		<div {...stylex.props(shell.page)}>
			<a href="#main" {...stylex.props(shell.skip)}>
				Skip to content
			</a>
			<SiteHeader siteName={chrome.header.siteName} header={chrome.header} />
			<main id="main" tabIndex={-1} {...stylex.props(shell.main)}>
				<Outlet />
			</main>
			<SiteFooter footer={chrome.footer} />
		</div>
	);
}
