import type { NodeCapabilityId } from "@cascade/outliner/node-capabilities";
import { resolveThemeId } from "@cascade/theme/themes";
import { toast } from "@cascade/ui/toast";
import { createContext, use, useEffect, useMemo, useState } from "react";
import { m } from "#/paraglide/messages.js";
import {
	type Settings,
	type SettingsPatch,
	settingsPatchSchema,
} from "@/features/settings/model/settings.schema";
import { defaultSettings } from "../model/default-settings";
import { useRemoteSettings, useUpdateSettings } from "./settings-queries";
import { useDocumentThemeEffects } from "./use-document-theme-effects";
import { useSystemPrefersDark } from "./use-system-theme";

export {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
} from "@/features/settings/model/settings.schema";

const SettingsContext = createContext<{
	settings: Settings;
	confirmedSettings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	saveSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [unsaved, setUnsaved] = useState<SettingsPatch>({});
	const systemPrefersDark = useSystemPrefersDark();

	const { data: remote } = useRemoteSettings();
	const { mutate } = useUpdateSettings((_merged, patch) => {
		setUnsaved(
			(prev) =>
				Object.fromEntries(
					Object.entries(prev).filter(
						([key, value]) => patch[key as keyof SettingsPatch] !== value,
					),
				) as SettingsPatch,
		);
	});

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
			mutate(defaultSettings());
		}
	}, [remoteValid, mutate]);

	const remoteSettings: SettingsPatch = remoteResult?.success
		? remoteResult.data
		: {};
	const confirmedSettings: Settings = {
		...defaultSettings(),
		...remoteSettings,
	};

	const settings: Settings = {
		...confirmedSettings,
		...unsaved,
	};
	const resolvedTheme = resolveThemeId(
		settings.theme,
		settings.lightTheme,
		settings.darkTheme,
		systemPrefersDark,
	);

	useDocumentThemeEffects(resolvedTheme, settings.font, settings.fontSize);

	function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
		setUnsaved((prev) => ({ ...prev, [key]: value }));
	}

	function saveSettings() {
		if (Object.keys(unsaved).length === 0) return;
		mutate(unsaved);
	}

	return (
		<SettingsContext
			value={{ settings, confirmedSettings, setSetting, saveSettings }}
		>
			{children}
		</SettingsContext>
	);
}

export function useSettings() {
	const ctx = use(SettingsContext);
	if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
	return ctx;
}

export function useNodeCapabilities(): ReadonlySet<NodeCapabilityId> {
	const { confirmedSettings } = useSettings();
	return useMemo(
		() => new Set(confirmedSettings.enabledNodeCapabilities),
		[confirmedSettings.enabledNodeCapabilities],
	);
}
