import { fontSizeAttribute } from "@cascade/theme/font-sizes";
import { fontAttribute } from "@cascade/theme/fonts";
import {
	isDarkTheme,
	resolveThemeId,
	SYSTEM_THEME,
	type ThemeId,
	themeAttribute,
} from "@cascade/theme/themes";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import {
	type Settings,
	type SettingsPatch,
	settingsPatchSchema,
} from "@/core/settings/settings-patch-schema";
import { orpc } from "@/orpc/client";

export {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
} from "@/core/settings/settings-patch-schema";

function defaults(): Settings {
	return {
		theme: SYSTEM_THEME,
		lightTheme: "light",
		darkTheme: "dark",
		font: "bitter",
		fontSize: "default",
		indentSize: 16,
		preAlphaBannerDismissed: false,
	};
}

function getSystemPrefersDark(): boolean {
	return (
		typeof matchMedia !== "undefined" &&
		matchMedia("(prefers-color-scheme: dark)").matches
	);
}

function syncThemeColorMeta(resolvedTheme: ThemeId) {
	const styles = getComputedStyle(document.documentElement);
	const property = isDarkTheme(resolvedTheme)
		? "--color-ink"
		: "--color-canvas";
	const color = styles.getPropertyValue(property).trim();
	if (!color) return;
	let meta = document.head.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.append(meta);
	}
	meta.content = color;
}

const SettingsContext = createContext<{
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	saveSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [unsaved, setUnsaved] = useState<SettingsPatch>({});
	const [systemPrefersDark, setSystemPrefersDark] =
		useState(getSystemPrefersDark);
	const queryClient = useQueryClient();

	// Live-updates the resolved theme when "sync with system" is selected and
	// the OS preference changes while the app is open (e.g. scheduled dark
	// mode kicking in), not just on the next load.
	useEffect(() => {
		if (typeof matchMedia === "undefined") return;
		const media = matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => setSystemPrefersDark(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);

	const queryOptions = orpc.settings.get.queryOptions();
	const { data: remote } = useQuery(queryOptions);

	const { mutate } = useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: (merged, patch) => {
				queryClient.setQueryData(queryOptions.queryKey, merged);
				setUnsaved(
					(prev) =>
						Object.fromEntries(
							Object.entries(prev).filter(
								([key, value]) => patch[key as keyof SettingsPatch] !== value,
							),
						) as SettingsPatch,
				);
			},
		}),
	);

	const remoteResult =
		remote === undefined ? undefined : settingsPatchSchema.safeParse(remote);
	const remoteValid = remoteResult?.success;

	// A stored settings row that no longer matches the current schema (e.g.
	// after a theme/font is removed from the registry) would otherwise apply
	// silently in a broken or unexpected way; reset it to known-good defaults
	// instead and let the user know.
	useEffect(() => {
		if (remoteValid === false) {
			toast.error(m.settings_invalid_reset());
			mutate(defaults());
		}
	}, [remoteValid, mutate]);

	const remoteSettings: SettingsPatch = remoteResult?.success
		? remoteResult.data
		: {};

	const settings: Settings = {
		...defaults(),
		...remoteSettings,
		...unsaved,
	};
	const resolvedTheme = resolveThemeId(
		settings.theme,
		settings.lightTheme,
		settings.darkTheme,
		systemPrefersDark,
	);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", isDarkTheme(resolvedTheme));
		const attribute = themeAttribute(resolvedTheme);
		if (attribute) root.dataset.theme = attribute;
		else delete root.dataset.theme;
		syncThemeColorMeta(resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		const root = document.documentElement;
		const attribute = fontAttribute(settings.font);
		if (attribute) root.dataset.font = attribute;
		else delete root.dataset.font;
	}, [settings.font]);

	useEffect(() => {
		const root = document.documentElement;
		const attribute = fontSizeAttribute(settings.fontSize);
		if (attribute) root.dataset.fontSize = attribute;
		else delete root.dataset.fontSize;
	}, [settings.fontSize]);

	function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
		setUnsaved((prev) => ({ ...prev, [key]: value }));
	}

	function saveSettings() {
		if (Object.keys(unsaved).length === 0) return;
		mutate(unsaved);
	}

	return (
		<SettingsContext value={{ settings, setSetting, saveSettings }}>
			{children}
		</SettingsContext>
	);
}

export function useSettings() {
	const ctx = use(SettingsContext);
	if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
	return ctx;
}
