import { defaultSettings } from "@cascade/api/default-settings";
import {
	type Settings,
	type SettingsPatch,
	settingsPatchSchema,
} from "@cascade/api/settings-schema";
import { resolveThemeId } from "@cascade/theme/themes";
import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";
import {
	applyDocumentFont,
	applyDocumentFontSize,
	applyDocumentTheme,
} from "./apply-document-settings";
import { useSystemPrefersDark } from "./use-system-theme";

export {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
} from "@cascade/api/settings-schema";

const SettingsContext = createContext<{
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	saveSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [unsaved, setUnsaved] = useState<SettingsPatch>({});
	const systemPrefersDark = useSystemPrefersDark();
	const queryClient = useQueryClient();

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
			mutate(defaultSettings());
		}
	}, [remoteValid, mutate]);

	const remoteSettings: SettingsPatch = remoteResult?.success
		? remoteResult.data
		: {};

	const settings: Settings = {
		...defaultSettings(),
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
		applyDocumentTheme(resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		applyDocumentFont(settings.font);
	}, [settings.font]);

	useEffect(() => {
		applyDocumentFontSize(settings.fontSize);
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
