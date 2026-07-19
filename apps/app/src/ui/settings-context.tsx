import { fontAttribute } from "@cascade/theme/fonts";
import {
	isDarkTheme,
	resolveThemeId,
	SYSTEM_THEME,
	themeAttribute,
} from "@cascade/theme/themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useState } from "react";
import type {
	Settings,
	SettingsPatch,
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

/** Stored `dark` flags predate themes; treat them as the matching built-in theme. */
export function withLegacyTheme(patch: SettingsPatch): SettingsPatch {
	if (patch.theme !== undefined || patch.dark === undefined) return patch;
	return { ...patch, theme: patch.dark ? "dark" : "light" };
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

	const settings: Settings = {
		...defaults(),
		...withLegacyTheme(remote ?? {}),
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
	}, [resolvedTheme]);

	useEffect(() => {
		const root = document.documentElement;
		const attribute = fontAttribute(settings.font);
		if (attribute) root.dataset.font = attribute;
		else delete root.dataset.font;
	}, [settings.font]);

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
