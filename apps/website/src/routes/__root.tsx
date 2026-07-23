import { PreAlphaBanner } from "@cascade/ui/pre-alpha-banner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppLabelsProvider } from "#/lib/labels-provider";
import { seoHead } from "#/lib/seo";
import { m } from "#/paraglide/messages.js";
import { getLocale, getTextDirection } from "#/paraglide/runtime.js";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";
import appCss from "../styles.css?url";

const home = seoHead(m.home_seo_title(), m.home_seo_description());

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "Cascade" },
			{ name: "twitter:card", content: "summary_large_image" },
			...home.meta,
		],
		scripts: [
			...(import.meta.env.PROD
				? [
						{
							defer: true,
							src: "https://rybbit.patrickroelofs.com/api/script.js",
							"data-site-id": "15be8ae7c0e2",
						},
					]
				: []),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			...home.links,
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang={getLocale()} dir={getTextDirection()}>
			<head>
				<HeadContent />
			</head>
			<body className="bg-canvas text-ink">
				<AppLabelsProvider>
					<PreAlphaBanner />
					{children}
				</AppLabelsProvider>
				{import.meta.env.DEV && (
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
				)}
				<Scripts />
			</body>
		</html>
	);
}
