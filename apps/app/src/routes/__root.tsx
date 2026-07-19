import { fontAttribute } from "@cascade/theme/fonts";
import {
	isDarkTheme,
	SYSTEM_THEME,
	themeAttribute,
} from "@cascade/theme/themes";
import { Toaster } from "@cascade/ui/toast";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	redirect,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { getLocale } from "#/paraglide/runtime.js";
import { getSession } from "@/auth/session";
import type { SettingsPatch } from "@/core/settings/settings-patch-schema";
import { AppLabelsProvider } from "@/lib/labels-provider";
import { orpc } from "@/orpc/client";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { AppHeader } from "@/ui/header/AppHeader";
import { SettingsProvider } from "@/ui/settings-context";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const webUrl = import.meta.env.VITE_WEB_URL ?? "localhost:3000";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ href: `${webUrl}/login` });
		}
		return { user: session.user };
	},
	loader: async ({ context: { queryClient } }) => {
		const settings = await queryClient
			.ensureQueryData(orpc.settings.get.queryOptions())
			.catch((): SettingsPatch => ({}));
		return { settings };
	},
	head: ({ loaderData }) => {
		const settings = loaderData?.settings ?? {};
		const isSystemSync =
			settings.theme === undefined || settings.theme === SYSTEM_THEME;
		const lightThemeId = settings.lightTheme ?? "light";
		const darkThemeId = settings.darkTheme ?? "dark";
		return {
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
				...(isSystemSync
					? [
							{
								// Runs before hydration to avoid a flash: mirrors
								// resolveThemeId/themeAttribute/isDarkTheme in plain JS
								// since those aren't reachable from an inline script.
								children: `(function(){var d=matchMedia("(prefers-color-scheme: dark)").matches;var id=d?${JSON.stringify(darkThemeId)}:${JSON.stringify(lightThemeId)};if(id!=="light"&&id!=="dark")document.documentElement.setAttribute("data-theme",id);if(d)document.documentElement.classList.add("dark");})()`,
							},
						]
					: []),
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
		};
	},
	errorComponent: GenericErrorComponent,
	shellComponent: RootDocument,
});

/**
 * The SSR'd `class`/`data-theme` for a fixed theme selection, or both
 * `undefined` when syncing with the OS preference — that case is handled by
 * the blocking inline script instead, since the server doesn't know the
 * client's `prefers-color-scheme`.
 */
function ssrThemeAttrs(settings: SettingsPatch) {
	if (settings.theme === undefined || settings.theme === SYSTEM_THEME) {
		return { dark: undefined, themeAttr: undefined };
	}
	return {
		dark: isDarkTheme(settings.theme),
		themeAttr: themeAttribute(settings.theme),
	};
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { settings } = Route.useLoaderData();
	const { dark, themeAttr } = ssrThemeAttrs(settings);
	return (
		<html
			lang={getLocale()}
			className={dark ? "dark" : undefined}
			data-theme={themeAttr}
			data-font={
				settings.font !== undefined ? fontAttribute(settings.font) : undefined
			}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className="flex h-dvh flex-col font-app bg-canvas text-ink dark:bg-ink dark:text-canvas">
				<NuqsAdapter>
					<AppLabelsProvider>
						<SettingsProvider>
							<Toaster>
								<AppHeader />
								{children}
							</Toaster>
						</SettingsProvider>
					</AppLabelsProvider>
				</NuqsAdapter>
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
