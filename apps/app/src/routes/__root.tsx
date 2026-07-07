import { Toaster } from "@cascade/ui/toast";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { SettingsProvider } from "@/ui/settings-context";
import { UserMenu } from "@/ui/user-menu";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
				content: "#f9e4d6",
			},
		],
		scripts: [
			{
				children:
					'if(JSON.parse(localStorage.settings||"{}").dark??matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")',
			},
			...(import.meta.env.PROD
				? [
						{
							defer: true,
							src: "https://umami.patrickroelofs.com/script.js",
							"data-website-id": "3b6d63e5-a55a-4c71-a30d-a28ec42b2bc0",
						},
					]
				: []),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
		],
	}),
	errorComponent: GenericErrorComponent,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="bg-super-ginger text-dark-grey dark:bg-dark-grey dark:text-super-ginger">
				<SettingsProvider>
					<Toaster>
						{children}
						<UserMenu />
					</Toaster>
				</SettingsProvider>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-left",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
