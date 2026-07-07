import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { seoHead } from "#/lib/seo";

import "@fontsource-variable/bitter/wght-italic.css";
import appCss from "../styles.css?url";

const home = seoHead(
	"Cascade - a quieter place to think in lists",
	"Cascade is an infinitely nested outliner. One outline for everything.",
);

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
							src: "https://umami.patrickroelofs.com/script.js",
							"data-website-id": "da150693-4b35-47a5-9961-83a4a3fde076",
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
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-super-ginger text-dark-grey">
				{children}
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
				<Scripts />
			</body>
		</html>
	);
}
