import { minimalNodeCapabilities } from "@cascade/outliner/node-capabilities";
import { SYSTEM_THEME } from "@cascade/theme/themes";
import type { Settings } from "./settings.schema";

export function defaultSettings(): Settings {
	return {
		theme: SYSTEM_THEME,
		lightTheme: "light",
		darkTheme: "dark",
		font: "bitter",
		fontSize: "default",
		indentSize: 16,
		enabledNodeCapabilities: [...minimalNodeCapabilities],
		hideCompletedByDefault: false,
		dueDateNotificationsEnabled: false,
		preAlphaBannerDismissed: false,
		onboardingCompleted: true,
		onboardingSampleNodeIds: {},
	};
}
