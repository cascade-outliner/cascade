import { colors, fonts } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ThemeToggle } from "#/components/theme-toggle.tsx";
import { ThemeProvider, themeInitScript } from "#/lib/theme.tsx";
import appCss from "../styles.css?url";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
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
});

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

const styles = stylex.create({
	body: {
		backgroundColor: colors.canvas,
		color: colors.ink,
		fontFamily: fonts.app,
		touchAction: "manipulation",
	},
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, compiler-generated theme class names, no user input */}
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body {...stylex.props(styles.body)}>
				<ThemeProvider>
					{children}
					<ThemeToggle />
				</ThemeProvider>
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
