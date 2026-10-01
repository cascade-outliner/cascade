/// <reference types="vite/client" />

import dmSans from "@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2?url";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { css } from "@/styled-system/css";
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
			{
				rel: "preload",
				href: dmSans,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{ rel: "stylesheet", href: styles },
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16.png",
			},
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
		],
	}),
});

const shell = {
	page: css({
		minHeight: "screen",
		display: "flex",
		flexDirection: "column",
		backgroundColor: "site.canvas",
		color: "site.ink",
		fontFamily: "site.sans",
		colorScheme: "light",
		fontSmoothing: "antialiased",
	}),
	main: css({
		flex: "1",
		outline: "none",
	}),
	skip: css({
		position: "absolute",
		insetInlineStart: "site.4",
		top: "[-100%]",
		zIndex: "overlay",
		paddingBlock: "site.2",
		paddingInline: "site.3.5",
		borderRadius: "md",
		backgroundColor: "site.ink",
		color: "site.onDark",
		textDecoration: "none",
		fontWeight: 600,
		_focus: {
			top: "site.4",
			boxShadow: "focusRing",
			outline: "none",
		},
	}),
};

function FrontendLayout() {
	const { chrome } = Route.useRouteContext();

	return (
		<div className={shell.page}>
			<a href="#main" className={shell.skip}>
				Skip to content
			</a>
			<SiteHeader siteName={chrome.header.siteName} header={chrome.header} />
			<main id="main" tabIndex={-1} className={shell.main}>
				<Outlet />
			</main>
			<SiteFooter footer={chrome.footer} />
		</div>
	);
}
