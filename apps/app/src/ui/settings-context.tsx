import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useMemo, useState } from "react";
import {
	type Settings,
	type SettingsPatch,
	settingsPatchSchema,
} from "@/core/settings/settings-patch-schema";
import { client, orpc } from "@/orpc/client";

export {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
} from "@/core/settings/settings-patch-schema";

function defaults(): Settings {
	return {
		dark:
			typeof matchMedia !== "undefined" &&
			matchMedia("(prefers-color-scheme: dark)").matches,
		indentSize: 16,
		lastSeenChangelogId: null,
		preAlphaBannerDismissed: false,
	};
}

/** localStorage keeps a copy of the settings patch so they apply instantly
 * on boot (before the server round-trip) and the dark-mode script in
 * `__root.tsx` can read it pre-hydration. */
function readLocal(): SettingsPatch {
	if (typeof localStorage === "undefined") return {};
	try {
		const parsed = settingsPatchSchema.safeParse(
			JSON.parse(localStorage.settings ?? "{}"),
		);
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

const SettingsContext = createContext<{
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	saveSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	// What localStorage held when the app booted; the fallback until (and in
	// case) the server responds.
	const [boot] = useState(readLocal);
	// Changes made since the last successful save; flushed by `saveSettings`
	// (called when the settings dialog closes).
	const [unsaved, setUnsaved] = useState<SettingsPatch>({});
	const queryClient = useQueryClient();

	const queryOptions = orpc.settings.get.queryOptions();
	// Refetched on window focus (the query default), so changes made on
	// another device are picked up when returning to the tab. When the account
	// has no stored settings yet, the fetch seeds it from this device's
	// pre-existing local settings instead of wiping them.
	const { data: remote } = useQuery({
		...queryOptions,
		queryFn: async (): Promise<SettingsPatch> => {
			const stored = await client.settings.get();
			if (Object.keys(stored).length > 0) return stored;
			const local = readLocal();
			if (Object.keys(local).length === 0) return stored;
			return client.settings.update(local);
		},
	});

	const { mutate } = useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: (merged, patch) => {
				// The server returns the merged row (which may include keys written
				// by other devices); make it the new baseline and drop the unsaved
				// keys it covers. A key re-changed while the save was in flight
				// keeps its newer value and goes out with the next save.
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
			// On error the patch simply stays in `unsaved`: the change keeps
			// applying locally and the next save retries it.
		}),
	);

	// Derived, never synced: server state over the boot cache, unsaved edits
	// on top. A focus refetch can update `remote` mid-edit without ever
	// clobbering what the user is doing.
	const stored = useMemo<SettingsPatch>(
		() => ({ ...boot, ...remote, ...unsaved }),
		[boot, remote, unsaved],
	);
	const settings: Settings = { ...defaults(), ...stored };

	// The `dark` class lives on <html> — outside this component's tree — and
	// localStorage feeds the pre-hydration dark-mode script in `__root.tsx`.
	// Both are external systems, so syncing them is the one legitimate effect
	// here.
	useEffect(() => {
		document.documentElement.classList.toggle("dark", settings.dark);
		localStorage.settings = JSON.stringify(stored);
	}, [settings.dark, stored]);

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
