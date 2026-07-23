import { fontSizeAttribute } from "@cascade/theme/font-sizes";
import { fontAttribute } from "@cascade/theme/fonts";
import {
	isDarkTheme,
	SYSTEM_THEME,
	themeAttribute,
} from "@cascade/theme/themes";
import { Toaster } from "@cascade/ui/toast";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Scripts, useMatches } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { getLocale } from "#/paraglide/runtime.js";
import { useUndoShortcuts } from "@/features/nodes/client/undo/use-undo-shortcuts";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import { AppLabelsProvider } from "./app-labels-provider";
import { authedSettings } from "./root-head";

function ssrThemeAttributes(settings: SettingsPatch) {
	if (settings.theme === undefined || settings.theme === SYSTEM_THEME) {
		return { dark: undefined, theme: undefined };
	}
	return {
		dark: isDarkTheme(settings.theme),
		theme: themeAttribute(settings.theme),
	};
}

function DevelopmentTools() {
	if (!import.meta.env.DEV) return null;
	return (
		<TanStackDevtools
			config={{ position: "bottom-left" }}
			plugins={[
				{
					name: "Tanstack Router",
					render: <TanStackRouterDevtoolsPanel />,
				},
				TanStackQueryDevtools,
			]}
		/>
	);
}

export function RootDocument({ children }: { children: React.ReactNode }) {
	const settings = authedSettings(useMatches());
	const { dark, theme } = ssrThemeAttributes(settings);
	useUndoShortcuts();

	return (
		<html
			lang={getLocale()}
			className={dark ? "dark" : undefined}
			data-theme={theme}
			data-font={
				settings.font !== undefined ? fontAttribute(settings.font) : undefined
			}
			data-font-size={
				settings.fontSize !== undefined
					? fontSizeAttribute(settings.fontSize)
					: undefined
			}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className="flex h-dvh flex-col bg-canvas font-app text-ink dark:bg-ink dark:text-canvas">
				<NuqsAdapter>
					<AppLabelsProvider>
						<Toaster>{children}</Toaster>
					</AppLabelsProvider>
				</NuqsAdapter>
				<DevelopmentTools />
				<Scripts />
			</body>
		</html>
	);
}
