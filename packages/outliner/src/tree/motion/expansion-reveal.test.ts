import { afterEach, describe, expect, it } from "vitest";
import {
	clearExpansionReveal,
	getExpansionReveal,
	markExpansionReveal,
	resetExpansionReveal,
} from "./expansion-reveal";

afterEach(() => {
	resetExpansionReveal();
});

describe("expansion reveal markers", () => {
	it("reveals only pending descendants in the current virtualizer slice", () => {
		markExpansionReveal([
			"visible-child",
			"overscan-child",
			"off-screen-child",
		]);

		expect(
			getExpansionReveal(["unrelated-row", "visible-child", "overscan-child"]),
		).toEqual(new Set(["visible-child", "overscan-child"]));
	});

	it("drops off-screen descendants so later mounts do not animate", () => {
		markExpansionReveal(["visible-child", "off-screen-child"]);

		expect(getExpansionReveal(["visible-child"])).toEqual(
			new Set(["visible-child"]),
		);
		clearExpansionReveal();

		expect(getExpansionReveal(["off-screen-child"])).toEqual(new Set());
	});
});
