export interface PointerSample {
	x: number;
	y: number;
	t: number;
}

export interface IntentCandidateRect {
	id: string;
	rect: { x: number; y: number; width: number; height: number };
	/** Obstacles (e.g. a drag handle) compete for space but are never a redirect target. */
	activatable: boolean;
}

export interface ResolveIntentOptions {
	pointerType: string | undefined;
	/** Hard cutoff beyond which a candidate is never considered, in px. */
	maxRadius: number;
	touchRadius: number;
	/** Path length below which a gesture is treated as a stationary tap, in px. */
	jitterThreshold: number;
}

const HEADING_SAMPLE_WINDOW = 5;

function clampedDistanceToRect(
	x: number,
	y: number,
	rect: IntentCandidateRect["rect"],
): number {
	const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
	const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
	return Math.hypot(x - closestX, y - closestY);
}

function rectCenter(rect: IntentCandidateRect["rect"]) {
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function pathLength(samples: PointerSample[]): number {
	let total = 0;
	for (let i = 1; i < samples.length; i++) {
		total += Math.hypot(
			samples[i].x - samples[i - 1].x,
			samples[i].y - samples[i - 1].y,
		);
	}
	return total;
}

function nearestWithinRadius(
	point: { x: number; y: number },
	candidates: IntentCandidateRect[],
	radius: number,
): IntentCandidateRect | null {
	let best: { candidate: IntentCandidateRect; distance: number } | null = null;
	for (const candidate of candidates) {
		const distance = clampedDistanceToRect(point.x, point.y, candidate.rect);
		if (distance > radius) continue;
		if (!best || distance < best.distance) best = { candidate, distance };
	}
	return best?.candidate ?? null;
}

/**
 * Decides whether a completed pointer gesture that missed every candidate's
 * exact bounds should still be treated as a press on one of them.
 *
 * Touch (and any near-stationary press) has no meaningful direction of
 * travel, so it falls back to nearest-candidate-within-radius. A mouse/pen
 * gesture with real movement instead favors whichever candidate the pointer
 * was heading toward, so two candidates flanking the release point on
 * opposite sides of the travel direction aren't confused for each other.
 */
export function resolveIntentTarget(
	samples: PointerSample[],
	candidates: IntentCandidateRect[],
	options: ResolveIntentOptions,
): string | null {
	if (samples.length === 0 || candidates.length === 0) return null;

	const release = samples[samples.length - 1];
	const radius =
		options.pointerType === "touch" ? options.touchRadius : options.maxRadius;

	const useTrajectory =
		options.pointerType !== "touch" &&
		samples.length >= 2 &&
		pathLength(samples) >= options.jitterThreshold;

	if (!useTrajectory) {
		const nearest = nearestWithinRadius(release, candidates, radius);
		return nearest?.activatable ? nearest.id : null;
	}

	const headingStart =
		samples[Math.max(0, samples.length - 1 - HEADING_SAMPLE_WINDOW)];
	const headingX = release.x - headingStart.x;
	const headingY = release.y - headingStart.y;
	const headingLength = Math.hypot(headingX, headingY);
	if (headingLength === 0) {
		const nearest = nearestWithinRadius(release, candidates, radius);
		return nearest?.activatable ? nearest.id : null;
	}

	// Obstacles (activatable: false) still compete for the "best" slot below: if
	// the trajectory is really heading toward an obstacle (e.g. the drag handle),
	// an activatable neighbor a bit further along must not steal the click.
	let best: { candidate: IntentCandidateRect; score: number } | null = null;
	for (const candidate of candidates) {
		const distance = clampedDistanceToRect(
			release.x,
			release.y,
			candidate.rect,
		);
		if (distance > radius) continue;

		const center = rectCenter(candidate.rect);
		const toCandidateX = center.x - release.x;
		const toCandidateY = center.y - release.y;
		const toCandidateLength = Math.hypot(toCandidateX, toCandidateY);

		// A candidate whose center coincides with the release point is always "ahead".
		const cosine =
			toCandidateLength === 0
				? 1
				: (headingX * toCandidateX + headingY * toCandidateY) /
					(headingLength * toCandidateLength);
		if (cosine <= 0) continue; // moving away from this candidate is never an intent match

		const score = cosine - distance / radius;
		if (!best || score > best.score) best = { candidate, score };
	}

	return best?.candidate.activatable ? best.candidate.id : null;
}
