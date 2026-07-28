import { motionDurations, motionEasings } from "@cascade/theme/motion";
import { describe, expect, it } from "vitest";
import {
	delightTransition,
	feedbackVariants,
	mediumEnterVariants,
	mediumExitVariants,
	repositionTransition,
	smallEnterVariants,
	smallExitVariants,
} from "./motion-variants";

describe("semantic motion patterns", () => {
	it("size enter/exit variants to the small/medium duration tokens, not raw numbers", () => {
		expect(smallEnterVariants.animate).toMatchObject({
			transition: { duration: motionDurations.smallEnter },
		});
		expect(smallExitVariants.exit).toMatchObject({
			transition: { duration: motionDurations.smallExit },
		});
		expect(mediumEnterVariants.animate).toMatchObject({
			transition: { duration: motionDurations.mediumEnter },
		});
		expect(mediumExitVariants.exit).toMatchObject({
			transition: { duration: motionDurations.mediumExit },
		});
	});

	it("keeps reposition and feedback opacity/scale-free of the sized enter/exit durations", () => {
		expect(repositionTransition.duration).toBe(motionDurations.mediumEnter);
		expect(feedbackVariants.animate).toMatchObject({
			transition: { duration: motionDurations.feedback },
		});
	});

	it("reserves the overshoot easing for the delight transition only", () => {
		expect(delightTransition.ease).toEqual(motionEasings.overshoot);
		for (const variants of [
			smallEnterVariants,
			smallExitVariants,
			mediumEnterVariants,
			mediumExitVariants,
			feedbackVariants,
		]) {
			const transition =
				(variants.animate as { transition?: { ease?: unknown } } | undefined)
					?.transition ??
				(variants.exit as { transition?: { ease?: unknown } } | undefined)
					?.transition;
			expect(transition?.ease).toEqual(motionEasings.standard);
		}
		expect(repositionTransition.ease).toEqual(motionEasings.standard);
	});
});
