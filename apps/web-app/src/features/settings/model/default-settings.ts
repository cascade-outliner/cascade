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
		hideCompletedByDefault: false,
		preAlphaBannerDismissed: false,
		// True by default so accounts that predate the onboarding tour (and so
		// never got an explicit `onboardingCompleted: false` row written by the
		// sign-up hook, see `seedOnboardingContent`) aren't retroactively shown
		// it. New signups get an explicit `false` row instead of relying on this
		// default.
		onboardingCompleted: true,
		onboardingSampleNodeIds: {},
	};
}
