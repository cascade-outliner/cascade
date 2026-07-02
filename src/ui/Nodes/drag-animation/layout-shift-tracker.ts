export interface RowFrameSample {
	id: string;
	visualTop: number;
	layoutTop: number;
}

export interface RowDisplacement {
	id: string;
	fromOffsetPx: number;
}

export class LayoutShiftTracker {
	readonly #rows = new Map<string, { visualTop: number; layoutTop: number }>();
	readonly #thresholdPx: number;
	readonly #ignoredId: string;

	constructor(thresholdPx: number, ignoredId: string) {
		this.#thresholdPx = thresholdPx;
		this.#ignoredId = ignoredId;
	}

	update(samples: readonly RowFrameSample[]): RowDisplacement[] {
		const displaced: RowDisplacement[] = [];
		for (const { id, visualTop, layoutTop } of samples) {
			const prev = this.#rows.get(id);
			const shifted =
				prev !== undefined &&
				id !== this.#ignoredId &&
				Math.abs(layoutTop - prev.layoutTop) > this.#thresholdPx;

			if (shifted) {
				displaced.push({ id, fromOffsetPx: prev.visualTop - layoutTop });
				this.#rows.set(id, { visualTop: prev.visualTop, layoutTop });
			} else {
				this.#rows.set(id, { visualTop, layoutTop });
			}
		}
		return displaced;
	}
}
