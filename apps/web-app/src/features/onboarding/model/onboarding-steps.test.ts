import { describe, expect, it } from "vitest";
import { onboardingAnchors, onboardingSteps } from "./onboarding-steps";

describe("onboardingSteps", () => {
	it("starts with an unanchored welcome step", () => {
		const [first] = onboardingSteps();
		expect(first?.element).toBeUndefined();
		expect(first?.popover?.title).toBeTruthy();
	});

	it("anchors every other step to a registered data-onboarding selector", () => {
		const steps = onboardingSteps();
		const anchoredSteps = steps.slice(1);
		expect(anchoredSteps).toHaveLength(Object.keys(onboardingAnchors).length);
		for (const step of anchoredSteps) {
			expect(step.element).toMatch(/^\[data-onboarding="[a-z-]+"\]$/);
			expect(step.popover?.title).toBeTruthy();
			expect(step.popover?.description).toBeTruthy();
		}
	});
});
