import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { css } from "#/styled-system/css";
import appCss from "../styles.css?url";

import "@fontsource-variable/dm-sans/opsz.css";
import "@fontsource-variable/dm-sans/opsz-italic.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
			},
			{
				title: "Cascade",
			},
			{
				name: "theme-color",
				content: "#ad4c4e",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
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
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return <p>Page not found.</p>;
}

const TanStackDevtoolsPanel = import.meta.env.DEV
	? lazy(async () => {
			const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] =
				await Promise.all([
					import("@tanstack/react-devtools"),
					import("@tanstack/react-router-devtools"),
				]);
			return {
				default: () => (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				),
			};
		})
	: null;

const styles = {
	body: css({
		colorScheme: "light dark",
		backgroundColor: "canvas",
		color: "ink",
		fontFamily: "app",
		touchAction: "manipulation",
		minHeight: "dvh",
		overscrollBehaviorY: "none",
	}),
};

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className={styles.body}>
				{children}
				{TanStackDevtoolsPanel && (
					<Suspense fallback={null}>
						<TanStackDevtoolsPanel />
					</Suspense>
				)}
				<Scripts />
			</body>
		</html>
	);
}
