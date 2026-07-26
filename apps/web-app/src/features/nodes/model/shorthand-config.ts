import type { ShorthandConfig } from "@cascade/outliner/shorthand";
import { getLocale } from "#/paraglide/runtime.js";

const EN_SHORTHAND: ShorthandConfig = {
	dates: {
		relative: { today: 0, tomorrow: 1, "next week": 7 },
		weekdays: {
			sunday: 0,
			monday: 1,
			tuesday: 2,
			wednesday: 3,
			thursday: 4,
			friday: 5,
			saturday: 6,
		},
		nextWord: "next",
	},
};

const NL_SHORTHAND: ShorthandConfig = {
	dates: {
		relative: { vandaag: 0, morgen: 1, "volgende week": 7 },
		weekdays: {
			zondag: 0,
			maandag: 1,
			dinsdag: 2,
			woensdag: 3,
			donderdag: 4,
			vrijdag: 5,
			zaterdag: 6,
		},
		nextWord: "volgende",
	},
};

export function activeShorthandConfig(): ShorthandConfig {
	return getLocale() === "nl" ? NL_SHORTHAND : EN_SHORTHAND;
}
