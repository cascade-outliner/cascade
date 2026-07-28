import { describe, expect, it } from "vitest";
import {
	type IntentCandidateRect,
	type PointerSample,
	type ResolveIntentOptions,
	resolveIntentTarget,
} from "./pointer-intent";

const defaultOptions: ResolveIntentOptions = {
	pointerType: "mouse",
	maxRadius: 24,
	touchRadius: 20,
	jitterThreshold: 4,
};

function sample(x: number, y: number, t = 0): PointerSample {
	return { x, y, t };
}

function candidate(
	id: string,
	rect: IntentCandidateRect["rect"],
	activatable = true,
): IntentCandidateRect {
	return { id, rect, activatable };
}

describe("resolveIntentTarget", () => {
	it("returns null with no samples or no candidates", () => {
		expect(
			resolveIntentTarget(
				[],
				[candidate("a", { x: 0, y: 0, width: 10, height: 10 })],
				defaultOptions,
			),
		).toBeNull();
		expect(resolveIntentTarget([sample(0, 0)], [], defaultOptions)).toBeNull();
	});

	it("touch: picks the nearest candidate within touchRadius, ignoring trajectory", () => {
		// Moving left-to-right, but "b" (behind the travel direction) is nearest.
		const samples = [sample(0, 0, 0), sample(50, 0, 16)];
		const candidates = [
			candidate("a", { x: 60, y: -5, width: 10, height: 10 }),
			candidate("b", { x: 38, y: -5, width: 10, height: 10 }),
		];
		expect(
			resolveIntentTarget(samples, candidates, {
				...defaultOptions,
				pointerType: "touch",
			}),
		).toBe("b");
	});

	it("touch: returns null when nothing is within touchRadius", () => {
		const samples = [sample(0, 0)];
		const candidates = [
			candidate("a", { x: 100, y: 100, width: 10, height: 10 }),
		];
		expect(
			resolveIntentTarget(samples, candidates, {
				...defaultOptions,
				pointerType: "touch",
			}),
		).toBeNull();
	});

	it("mouse: a stationary click (below jitterThreshold) falls back to nearest-within-radius", () => {
		const samples = [sample(10, 10, 0), sample(11, 10, 8), sample(10, 11, 16)];
		const candidates = [
			candidate("far", { x: 5, y: -20, width: 8, height: 8 }),
			candidate("near", { x: 14, y: 14, width: 8, height: 8 }),
		];
		expect(resolveIntentTarget(samples, candidates, defaultOptions)).toBe(
			"near",
		);
	});

	it("mouse: disambiguates two candidates flanking the release point by heading direction", () => {
		// Pointer travels straight right; "ahead" sits to the right of the release
		// point, "behind" sits to the left — both are within maxRadius of release.
		const samples = [sample(0, 0, 0), sample(10, 0, 16), sample(20, 0, 32)];
		const ahead = candidate("ahead", { x: 30, y: -4, width: 8, height: 8 });
		const behind = candidate("behind", { x: 4, y: -4, width: 8, height: 8 });
		expect(resolveIntentTarget(samples, [ahead, behind], defaultOptions)).toBe(
			"ahead",
		);
	});

	it("mouse: never redirects to a candidate the pointer is moving away from", () => {
		const samples = [sample(0, 0, 0), sample(10, 0, 16), sample(20, 0, 32)];
		const behind = candidate("behind", { x: 4, y: -4, width: 8, height: 8 });
		expect(resolveIntentTarget(samples, [behind], defaultOptions)).toBeNull();
	});

	it("never resolves to a non-activatable candidate", () => {
		// touch/stationary path: nearest is the obstacle itself -> no redirect.
		expect(
			resolveIntentTarget(
				[sample(0, 0)],
				[
					candidate(
						"obstacle-only",
						{ x: 2, y: 2, width: 4, height: 4 },
						false,
					),
				],
				{ ...defaultOptions, pointerType: "touch" },
			),
		).toBeNull();
	});

	it("an obstacle directly ahead suppresses redirect to an activatable candidate further along, but a clearly closer activatable candidate still wins", () => {
		const samples = [sample(0, 0, 0), sample(10, 0, 16), sample(20, 0, 32)];

		// The obstacle sits right where the trajectory is heading; a real button
		// further down the same line must not steal a click clearly meant for it.
		const obstacleAhead = candidate(
			"obstacle",
			{ x: 21, y: -2, width: 4, height: 4 },
			false,
		);
		const further = candidate(
			"target",
			{ x: 30, y: -2, width: 4, height: 4 },
			true,
		);
		expect(
			resolveIntentTarget(samples, [obstacleAhead, further], defaultOptions),
		).toBeNull();

		// But when only the activatable candidate is within range, it still wins.
		expect(resolveIntentTarget(samples, [further], defaultOptions)).toBe(
			"target",
		);
	});

	it("candidates beyond maxRadius never win", () => {
		const samples = [sample(0, 0, 0), sample(10, 0, 16), sample(20, 0, 32)];
		const tooFar = candidate("far", { x: 200, y: 0, width: 8, height: 8 });
		expect(resolveIntentTarget(samples, [tooFar], defaultOptions)).toBeNull();
	});

	it("a click landing directly inside a candidate resolves to that candidate", () => {
		const samples = [sample(0, 0, 0), sample(10, 0, 16), sample(15, 0, 32)];
		const hit = candidate("hit", { x: 12, y: -3, width: 6, height: 6 });
		expect(resolveIntentTarget(samples, [hit], defaultOptions)).toBe("hit");
	});
});
