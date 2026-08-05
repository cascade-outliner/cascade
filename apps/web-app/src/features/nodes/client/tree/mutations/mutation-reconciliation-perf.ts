export interface MutationReconciliationSample {
	mutationKey: string;
	/** Server response landing (mutation promise resolved) to the query cache write. */
	reconciliationMs: number;
	/** Query cache write to the next painted frame. */
	paintMs: number;
	totalMs: number;
}

interface PerfTimingWindow {
	__CASCADE_MUTATION_TIMING__?: boolean;
	__cascadeMutationTimings?: MutationReconciliationSample[];
}

function timingWindow(): PerfTimingWindow | null {
	if (typeof window === "undefined") return null;
	const w = window as unknown as PerfTimingWindow;
	return w.__CASCADE_MUTATION_TIMING__ ? w : null;
}

/**
 * Opt-in perf instrumentation for issue #597: the gap between a mutation's
 * server response landing and the resulting UI commit, split into the
 * TanStack Query cache write ("reconciliation") and the paint that follows.
 * Inert unless `window.__CASCADE_MUTATION_TIMING__` is set — the same opt-in
 * shape as `window.__CASCADE_ROW_MOTION__` in `virtual-tree-row.tsx` — so it
 * costs real users nothing. `responseAt` is a `performance.now()` timestamp
 * taken by the caller right after its mutation's response resolved, and this
 * must be called synchronously after the resulting cache write.
 */
export function recordMutationReconciliation(
	mutationKey: string,
	responseAt: number,
): void {
	const w = timingWindow();
	if (!w) return;
	const storeUpdatedAt = performance.now();
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const paintCommittedAt = performance.now();
			w.__cascadeMutationTimings ??= [];
			w.__cascadeMutationTimings.push({
				mutationKey,
				reconciliationMs: storeUpdatedAt - responseAt,
				paintMs: paintCommittedAt - storeUpdatedAt,
				totalMs: paintCommittedAt - responseAt,
			});
		});
	});
}
