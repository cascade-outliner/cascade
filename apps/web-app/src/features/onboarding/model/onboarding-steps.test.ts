import { describe, expect, it } from "vitest";
import type { OnboardingSampleNodeIds } from "@/features/settings/model/settings.schema";
import { onboardingAnchors, onboardingSteps } from "./onboarding-steps";

const fullSampleNodeIds: OnboardingSampleNodeIds = {
	createNode: "id-create",
	indentNode: "id-indent",
	focusDot: "id-focus-dot",
	task: "id-task",
	tagged: "id-tagged",
};

describe("onboardingSteps", () => {
	it("starts with an unanchored welcome step", () => {
		const [first] = onboardingSteps({});
		expect(first?.element).toBeUndefined();
		expect(first?.popover?.title).toBeTruthy();
	});

	it("anchors a step to every sample node id and every header control when all are known", () => {
		const steps = onboardingSteps(fullSampleNodeIds);
		const anchoredSteps = steps.slice(1);
		expect(anchoredSteps).toHaveLength(
			Object.keys(fullSampleNodeIds).length +
				Object.keys(onboardingAnchors).length,
		);
		for (const step of anchoredSteps) {
			expect(step.element).toMatch(/^\[(id|data-onboarding)="[^"]+"\]$/);
			expect(step.popover?.title).toBeTruthy();
			expect(step.popover?.description).toBeTruthy();
		}
	});

	it("omits a sample-node step when that node's id is unknown", () => {
		const steps = onboardingSteps({});
		const anchoredSteps = steps.slice(1);
		// Only the header controls remain — no sample outline ids were given.
		expect(anchoredSteps).toHaveLength(Object.keys(onboardingAnchors).length);
		for (const step of anchoredSteps) {
			expect(step.element).toMatch(/^\[data-onboarding="[a-z-]+"\]$/);
		}
	});

	it("includes only the sample-node steps whose id is known", () => {
		const steps = onboardingSteps({ task: "id-task" });
		const taskStep = steps.find((step) => step.element === '[id="id-task"]');
		expect(taskStep).toBeDefined();
		expect(steps.some((step) => step.element === '[id="id-create"]')).toBe(
			false,
		);
	});
});
