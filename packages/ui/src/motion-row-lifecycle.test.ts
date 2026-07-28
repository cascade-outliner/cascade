import { motionDurationsMs, motionEasingsCss } from "@cascade/theme/motion";
import { describe, expect, it, vi } from "vitest";
import {
	animateRowEnter,
	animateRowExit,
	flashRowHighlight,
} from "./motion-row-lifecycle";

function fakeRow() {
	return { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
}

describe("animateRowEnter", () => {
	it("fades and rises the row in", () => {
		const row = fakeRow();

		animateRowEnter(row, false);

		expect(row.animate).toHaveBeenCalledWith(
			[
				{ opacity: 0, transform: "translateY(4px)" },
				{ opacity: 1, transform: "translateY(0px)" },
			],
			{
				duration: motionDurationsMs.smallEnter,
				easing: motionEasingsCss.standard,
				fill: "backwards",
			},
		);
	});

	it("drops the rise under reduced motion but keeps the opacity fade", () => {
		const row = fakeRow();

		animateRowEnter(row, true);

		expect(row.animate).toHaveBeenCalledWith(
			[
				{ opacity: 0, transform: "translateY(0px)" },
				{ opacity: 1, transform: "translateY(0px)" },
			],
			expect.objectContaining({ duration: motionDurationsMs.smallEnter }),
		);
	});
});

describe("animateRowExit", () => {
	it("fades and rises the row out faster than the enter", () => {
		const row = fakeRow();

		animateRowExit(row, false);

		expect(row.animate).toHaveBeenCalledWith(
			[
				{ opacity: 1, transform: "translateY(0px)" },
				{ opacity: 0, transform: "translateY(-4px)" },
			],
			{
				duration: motionDurationsMs.smallExit,
				easing: motionEasingsCss.standard,
				fill: "forwards",
			},
		);
		expect(motionDurationsMs.smallExit).toBeLessThan(
			motionDurationsMs.smallEnter,
		);
	});

	it("drops the rise under reduced motion but keeps the opacity fade", () => {
		const row = fakeRow();

		animateRowExit(row, true);

		expect(row.animate).toHaveBeenCalledWith(
			[
				{ opacity: 1, transform: "translateY(0px)" },
				{ opacity: 0, transform: "translateY(0px)" },
			],
			expect.objectContaining({ duration: motionDurationsMs.smallExit }),
		);
	});

	it("returns the animation so a caller can await its finish", async () => {
		const row = fakeRow();

		const animation = animateRowExit(row, false);

		await expect(animation?.finished).resolves.toBeUndefined();
	});
});

describe("flashRowHighlight", () => {
	it("flashes a one-shot, non-repeating background color", () => {
		const row = fakeRow();

		flashRowHighlight(row);

		expect(row.animate).toHaveBeenCalledWith(
			[
				{ backgroundColor: "var(--color-accent)" },
				{ backgroundColor: "transparent" },
			],
			{
				duration: motionDurationsMs.feedback,
				easing: motionEasingsCss.standard,
			},
		);
	});
});
