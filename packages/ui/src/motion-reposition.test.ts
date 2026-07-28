import { motionDurationsMs, motionEasingsCss } from "@cascade/theme/motion";
import { describe, expect, it, vi } from "vitest";
import {
	animateRowReposition,
	prefersReducedMotion,
} from "./motion-reposition";

function fakeRow() {
	return { animate: vi.fn() };
}

describe("prefersReducedMotion", () => {
	it("is false outside a browser (SSR), never throwing on a missing `window`", () => {
		expect(prefersReducedMotion()).toBe(false);
	});
});

describe("animateRowReposition", () => {
	it("animates the row's own transform from the old to the new offset", () => {
		const row = fakeRow();

		animateRowReposition(row, 40, 120, false);

		expect(row.animate).toHaveBeenCalledWith(
			[{ transform: "translateY(40px)" }, { transform: "translateY(120px)" }],
			{
				duration: motionDurationsMs.mediumEnter,
				easing: motionEasingsCss.standard,
				fill: "both",
			},
		);
	});

	it("does nothing when the offset didn't change", () => {
		const row = fakeRow();

		animateRowReposition(row, 80, 80, false);

		expect(row.animate).not.toHaveBeenCalled();
	});

	it("does nothing under reduced motion, even when the offset changed", () => {
		const row = fakeRow();

		animateRowReposition(row, 40, 120, true);

		expect(row.animate).not.toHaveBeenCalled();
	});
});
