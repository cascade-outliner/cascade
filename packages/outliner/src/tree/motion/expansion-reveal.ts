const pendingExpansionRowIds = new Set<string>();

/**
 * Records descendants inserted by an expansion. The virtual tree consumes
 * only the ids in its current visible/overscan slice on the next render.
 */
export function markExpansionReveal(rowIds: Iterable<string>): void {
	for (const id of rowIds) pendingExpansionRowIds.add(id);
}

/**
 * Returns pending descendants in the current virtualizer slice without
 * mutating the batch, keeping render safe under retries and Strict Mode.
 */
export function getExpansionReveal(
	virtualizedRowIds: Iterable<string>,
): Set<string> {
	if (pendingExpansionRowIds.size === 0) return new Set();

	const revealed = new Set<string>();
	for (const id of virtualizedRowIds) {
		if (pendingExpansionRowIds.has(id)) revealed.add(id);
	}
	return revealed;
}

/** Drops the committed batch so descendants mounted later by scrolling never animate. */
export function clearExpansionReveal(): void {
	pendingExpansionRowIds.clear();
}

/** Test-only: clears transient state so specs don't leak across cases. */
export function resetExpansionReveal(): void {
	clearExpansionReveal();
}
