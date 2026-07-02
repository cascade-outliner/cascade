export interface SettleSample {
	sameElement: boolean;
	top: number;
}

export type SettleVerdict = "waiting" | "settle" | "timeout";

export interface SettleDetectionConfig {
	stableFrames: number;
	maxFrames: number;
	movementThresholdPx: number;
}

export class SettleDetector {
	readonly #config: SettleDetectionConfig;
	readonly #initialTop: number;
	#frames = 0;
	#stableFrames = 0;
	#lastTop: number | null = null;

	constructor(config: SettleDetectionConfig, initialTop: number) {
		this.#config = config;
		this.#initialTop = initialTop;
	}

	next(sample: SettleSample | null): SettleVerdict {
		const { stableFrames, maxFrames, movementThresholdPx } = this.#config;

		const moved =
			sample !== null &&
			(!sample.sameElement ||
				Math.abs(sample.top - this.#initialTop) > movementThresholdPx);

		if (moved) {
			const heldStill =
				this.#lastTop !== null &&
				Math.abs(sample.top - this.#lastTop) < movementThresholdPx;
			this.#stableFrames = heldStill ? this.#stableFrames + 1 : 0;
			this.#lastTop = sample.top;
			if (this.#stableFrames >= stableFrames) return "settle";
		}

		this.#frames += 1;
		return this.#frames < maxFrames ? "waiting" : "timeout";
	}
}
