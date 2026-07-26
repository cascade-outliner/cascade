import {
	parseShorthand,
	type ShorthandConfig,
} from "@cascade/outliner/shorthand";
import { describe, expect, it } from "vitest";

const en: ShorthandConfig = {
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

describe("parseShorthand", () => {
	it("recognizes Unicode tags at boundaries and rejects invalid forms", () => {
		expect(
			parseShorthand("#Ångström foo #project_one #two-part", en).map(
				(match) => match.kind === "tag" && match.tag,
			),
		).toEqual(["Ångström", "project_one", "two-part"]);
		expect(parseShorthand("mail#tag #-bad #bad_ #a.b", en)).toEqual([]);
		expect(parseShorthand(`#${"a".repeat(65)}`, en)).toEqual([]);
	});

	it("parses phrases case-insensitively using local calendar math", () => {
		const now = new Date(2026, 6, 26, 23, 30);
		const matches = parseShorthand(
			"!TODAY !tomorrow !next week !monday !next monday",
			en,
			now,
		).filter((match) => match.kind === "dueDate");
		expect(
			matches.map(({ dueDate }) => dueDate.toLocaleDateString("sv-SE")),
		).toEqual([
			"2026-07-26",
			"2026-07-27",
			"2026-08-02",
			"2026-07-27",
			"2026-08-03",
		]);
	});

	it("uses only the active vocabulary", () => {
		expect(parseShorthand("!morgen", en)).toEqual([]);
		const nl: ShorthandConfig = {
			dates: {
				relative: { vandaag: 0, morgen: 1, "volgende week": 7 },
				weekdays: { maandag: 1 },
				nextWord: "volgende",
			},
		};
		expect(
			parseShorthand("!MORGEN !volgende maandag", nl, new Date(2026, 6, 26)),
		).toHaveLength(2);
		expect(parseShorthand("!tomorrow", nl)).toEqual([]);
	});
});
