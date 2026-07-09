import { createContext, use, useState } from "react";

export const MIN_INDENT_SIZE = 2;
export const MAX_INDENT_SIZE = 64;

interface Settings {
	dark: boolean;
	indentSize: number;
	lastSeenChangelogId: string | null;
	preAlphaBannerDismissed: boolean;
	hideCompletedTasks: boolean;
}

function defaults(): Settings {
	return {
		dark:
			typeof matchMedia !== "undefined" &&
			matchMedia("(prefers-color-scheme: dark)").matches,
		indentSize: 16,
		lastSeenChangelogId: null,
		preAlphaBannerDismissed: false,
		hideCompletedTasks: false,
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
