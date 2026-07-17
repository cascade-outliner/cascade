import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useRef, useState } from "react";
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
		dark:
			typeof matchMedia !== "undefined" &&
			matchMedia("(prefers-color-scheme: dark)").matches,
		indentSize: 16,
		lastSeenChangelogId: null,
		preAlphaBannerDismissed: false,
	};
}

/** localStorage keeps a copy of the stored patch so settings apply instantly
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

function writeLocal(stored: SettingsPatch) {
	localStorage.settings = JSON.stringify(stored);
}

const SettingsContext = createContext<{
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	saveSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [stored, setStored] = useState<SettingsPatch>(readLocal);
	// Changes made since the last save; flushed to the server by
	// `saveSettings` (called when the settings dialog closes).
	const unsaved = useRef<SettingsPatch>({});
	const seededServer = useRef(false);
	const queryClient = useQueryClient();

	// Fetched on load and refetched on window focus (the query default), so
	// changes made on another device are picked up when returning to the tab.
	const { data: remote } = useQuery(orpc.settings.get.queryOptions());

	const updateSettings = useMutation(
		orpc.settings.update.mutationOptions({
			onSuccess: (merged) => {
				// The server returns the merged row (which may include keys written
				// by other devices); adopt it as the new baseline unless more
				// changes accumulated while the save was in flight.
				if (Object.keys(unsaved.current).length > 0) return;
				queryClient.setQueryData(
					orpc.settings.get.queryOptions().queryKey,
					merged,
				);
			},
			onError: (_error, patch) => {
				// Offline or transient failure: the change still applies locally.
				// Put the patch back so the next save retries it; keys changed
				// again since take precedence.
				unsaved.current = { ...patch, ...unsaved.current };
			},
		}),
	);
	const { isPending, mutate } = updateSettings;

	useEffect(() => {
		if (remote === undefined) return;
		// Unsaved local changes take precedence until they're flushed.
		if (isPending || Object.keys(unsaved.current).length > 0) return;
		if (Object.keys(remote).length === 0) {
			// Nothing stored server-side yet: seed it from this device's
			// pre-existing local settings instead of wiping them.
			const local = readLocal();
			if (!seededServer.current && Object.keys(local).length > 0) {
				seededServer.current = true;
				mutate(local);
			}
			return;
		}
		setStored(remote);
		writeLocal(remote);
	}, [remote, isPending, mutate]);

	const settings: Settings = { ...defaults(), ...stored };

	useEffect(() => {
		document.documentElement.classList.toggle("dark", settings.dark);
	}, [settings.dark]);

	function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
		const next = { ...stored, [key]: value };
		setStored(next);
		writeLocal(next);
		unsaved.current = { ...unsaved.current, [key]: value };
	}

	function saveSettings() {
		const patch = unsaved.current;
		if (Object.keys(patch).length === 0) return;
		unsaved.current = {};
		mutate(patch);
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
