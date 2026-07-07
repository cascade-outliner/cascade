import { createContext, use, useEffect, useState } from "react";
import { sound } from "@/lib/sound";

export const MIN_INDENT_SIZE = 2;
export const MAX_INDENT_SIZE = 64;

interface Settings {
	dark: boolean;
	soundEnabled: boolean;
	indentSize: number;
	lastSeenChangelogId: string | null;
}

function defaults(): Settings {
	return {
		dark:
			typeof matchMedia !== "undefined" &&
			matchMedia("(prefers-color-scheme: dark)").matches,
		soundEnabled: true,
		indentSize: 16,
		lastSeenChangelogId: null,
	};
}

function read(): Settings {
	if (typeof localStorage === "undefined") return defaults();
	try {
		return { ...defaults(), ...JSON.parse(localStorage.settings ?? "{}") };
	} catch {
		return defaults();
	}
}

function write(settings: Settings) {
	localStorage.settings = JSON.stringify(settings);
	document.documentElement.classList.toggle("dark", settings.dark);
}

const SettingsContext = createContext<{
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState(read);

	useEffect(() => {
		sound.setEnabled(settings.soundEnabled);
	}, [settings.soundEnabled]);

	function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
		const next = { ...settings, [key]: value };
		setSettings(next);
		write(next);
	}

	return (
		<SettingsContext value={{ settings, setSetting }}>
			{children}
		</SettingsContext>
	);
}

export function useSettings() {
	const ctx = use(SettingsContext);
	if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
	return ctx;
}
