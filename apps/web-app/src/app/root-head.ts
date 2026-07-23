import { SYSTEM_THEME } from "@cascade/theme/themes";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import appCss from "../styles.css?url";

interface RouteMatch {
	routeId: string;
	loaderData?: unknown;
}

interface AuthedLoaderData {
	settings: SettingsPatch;
}

export function authedSettings(
	matches: ReadonlyArray<RouteMatch>,
): SettingsPatch {
	const authedMatch = matches.find((match) => match.routeId === "/_authed");
	return (
		(authedMatch?.loaderData as AuthedLoaderData | undefined)?.settings ?? {}
	);
}

function themeBootstrapScript(settings: SettingsPatch) {
	const isSystemSync =
		settings.theme === undefined || settings.theme === SYSTEM_THEME;
	if (!isSystemSync) return [];

	const lightThemeId = settings.lightTheme ?? "light";
	const darkThemeId = settings.darkTheme ?? "dark";
	return [
		{
			children: `(function(){var d=matchMedia("(prefers-color-scheme: dark)").matches;var id=d?${JSON.stringify(darkThemeId)}:${JSON.stringify(lightThemeId)};if(id!=="light"&&id!=="dark")document.documentElement.setAttribute("data-theme",id);if(d)document.documentElement.classList.add("dark");})()`,
		},
	];
}

function analyticsScripts() {
	if (!import.meta.env.PROD) return [];
	return [
		{
			defer: true,
			src: "https://rybbit.patrickroelofs.com/api/script.js",
			"data-site-id": "15be8ae7c0e2",
		},
	];
}

export function buildRootHead(matches: ReadonlyArray<RouteMatch>) {
	const settings = authedSettings(matches);
	return {
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Cascade" },
		],
		scripts: [...themeBootstrapScript(settings), ...analyticsScripts()],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "apple-touch-icon", href: "/logo192.png" },
			{ rel: "manifest", href: "/manifest.json" },
		],
	};
}
