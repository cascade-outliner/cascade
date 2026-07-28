/**
 * Chains async tasks so each one starts only after the previous settles,
 * regardless of whether it succeeded. Used to sequence same-field remote
 * writes and to serialize structural commands per tree.
 */
export class SerialQueue {
	private tail: Promise<unknown> = Promise.resolve();

	run<T>(task: () => Promise<T>): Promise<T> {
		const started = this.tail.then(task, task);
		this.tail = started.then(
			() => undefined,
			() => undefined,
		);
		return started;
	}
}

/** Per-key `SerialQueue` pool, e.g. one queue per `nodeId:field`. */
export class SerialQueueRegistry {
	private queues = new Map<string, SerialQueue>();

	for(key: string): SerialQueue {
		const existing = this.queues.get(key);
		if (existing) return existing;
		const created = new SerialQueue();
		this.queues.set(key, created);
		return created;
	}
}
