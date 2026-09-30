import type { Preferences } from "./types.ts";

/** In-memory preferences, for tests and environments without IndexedDB. */
export class MemoryPreferences implements Preferences {
	readonly #values = new Map<string, unknown>();

	constructor(initial: Record<string, unknown> = {}) {
		for (const [key, value] of Object.entries(initial)) {
			this.#values.set(key, value);
		}
	}

	async get(key: string): Promise<unknown> {
		return this.#values.get(key);
	}

	async set(key: string, value: unknown): Promise<void> {
		this.#values.set(key, value);
	}

	async remove(key: string): Promise<void> {
		this.#values.delete(key);
	}

	subscribe(): () => void {
		return () => {};
	}
}
