import type { Node } from "../outline/types.ts";
import type { OutlineChange } from "../persistence/types.ts";
import type { SyncedPersistence } from "./synced-persistence.ts";
import type {
	OnboardingRecord,
	OutboxEntry,
	PullResponse,
	PushRequest,
	SyncState,
	SyncStatus,
	SyncTransport,
	Tombstone,
} from "./types.ts";

export interface SyncEngineOptions {
	persistence: SyncedPersistence;
	state: SyncState;
	transport: SyncTransport;
	/** Trailing delay after a local write before it is pushed. */
	pushDelayMs?: number;
	/** Interval between background pulls. */
	pullIntervalMs?: number;
	/** First retry delay after a failure; doubles up to `maxBackoffMs`. */
	backoffMs?: number;
	maxBackoffMs?: number;
	onStatus?: (status: SyncStatus) => void;
}

const LOCK_NAME = "cascade:sync";
const PUSH_BATCH = 500;

/**
 * Background job that mirrors the local outline to the server and back.
 *
 * Local writes go to the outbox (via `SyncedPersistence`) and are pushed on a
 * trailing debounce. Pulls run at start, periodically, and when the tab is
 * shown again. Per node the newer `updatedAt` wins; the local copy is only
 * overwritten by a strictly newer server version.
 */
export class SyncEngine {
	readonly #persistence: SyncedPersistence;
	readonly #state: SyncState;
	readonly #transport: SyncTransport;
	readonly #pushDelayMs: number;
	readonly #pullIntervalMs: number;
	readonly #backoffMs: number;
	readonly #maxBackoffMs: number;
	readonly #onStatus?: (status: SyncStatus) => void;

	#status: SyncStatus = "disabled";
	#userId: string | null = null;
	#running = false;
	#started: Promise<void> = Promise.resolve();
	#pushTimer: ReturnType<typeof setTimeout> | null = null;
	#pullTimer: ReturnType<typeof setTimeout> | null = null;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#failures = 0;
	#queue: Promise<void> = Promise.resolve();
	#cleanup: (() => void)[] = [];
	readonly #statusListeners = new Set<(status: SyncStatus) => void>();
	lastSyncedAt: number | null = null;

	constructor(options: SyncEngineOptions) {
		this.#persistence = options.persistence;
		this.#state = options.state;
		this.#transport = options.transport;
		this.#pushDelayMs = options.pushDelayMs ?? 2_000;
		this.#pullIntervalMs = options.pullIntervalMs ?? 30_000;
		this.#backoffMs = options.backoffMs ?? 2_000;
		this.#maxBackoffMs = options.maxBackoffMs ?? 60_000;
		this.#onStatus = options.onStatus;
	}

	get status(): SyncStatus {
		return this.#status;
	}

	get userId(): string | null {
		return this.#userId;
	}

	/** Calls `listener` whenever `status` changes. Returns an unsubscribe function. */
	subscribeStatus(listener: (status: SyncStatus) => void): () => void {
		this.#statusListeners.add(listener);
		return () => this.#statusListeners.delete(listener);
	}

	/**
	 * Remembers that onboarding finished, to be sent with the
	 * next push. Safe to call while the engine is stopped: the record waits in
	 * sync state until a later start.
	 */
	async recordOnboarding(): Promise<void> {
		await this.#state.setMeta({
			onboarding: { completedAt: Date.now(), synced: false },
		});
		this.#schedulePush();
	}

	/** Whether onboarding finished here or, as far as the last full pull knew, on the server. */
	async isOnboarded(): Promise<boolean> {
		return (await this.#state.getMeta()).onboarding !== null;
	}

	/**
	 * Starts syncing as `userId`; resolves once the first sync settles, also
	 * for repeat callers. The local outline follows the first user who syncs
	 * it: a different user signing in on this browser starts from that user's
	 * server copy instead.
	 */
	start(userId: string): Promise<void> {
		if (!this.#running) {
			this.#running = true;
			this.#started = this.#start(userId);
		}
		return this.#started;
	}

	async #start(userId: string): Promise<void> {
		this.#setStatus("idle");
		this.#persistence.onWrite = () => this.#schedulePush();

		await this.#adopt(userId);
		this.#userId = userId;

		if (typeof window !== "undefined") {
			const onOnline = () => void this.sync();
			const onVisible = () => {
				if (document.visibilityState === "visible") {
					void this.pull();
				}
			};
			window.addEventListener("online", onOnline);
			document.addEventListener("visibilitychange", onVisible);
			this.#cleanup.push(
				() => window.removeEventListener("online", onOnline),
				() => document.removeEventListener("visibilitychange", onVisible),
			);
		}

		// Full pull on start: the server decides which nodes still exist.
		await this.#run(async () => {
			await this.#pull(true);
			await this.#push();
		});
		this.#schedulePull();
	}

	stop(): void {
		this.#running = false;
		this.#persistence.onWrite = null;
		for (const timer of [this.#pushTimer, this.#pullTimer, this.#retryTimer]) {
			if (timer) {
				clearTimeout(timer);
			}
		}
		this.#pushTimer = this.#pullTimer = this.#retryTimer = null;
		for (const cleanup of this.#cleanup) {
			cleanup();
		}
		this.#cleanup = [];
		this.#setStatus("disabled");
	}

	/** Pull, then push. Serialized with any other run in this or another tab. */
	sync(): Promise<void> {
		return this.#run(async () => {
			await this.#pull();
			await this.#push();
		});
	}

	push(): Promise<void> {
		return this.#run(() => this.#push());
	}

	pull(): Promise<void> {
		return this.#run(() => this.#pull());
	}

	/**
	 * Binds the local outline to `userId`. When another user synced it before,
	 * their nodes, unpushed changes and cursor are dropped first so nothing
	 * crosses between accounts.
	 */
	async #adopt(userId: string): Promise<void> {
		const meta = await this.#state.getMeta();
		if (meta.userId === userId) {
			return;
		}
		if (meta.userId !== null) {
			const local = await this.#persistence.inner.load();
			const change: OutlineChange = {
				put: [],
				delete: local.map((node) => node.id),
			};
			if (change.delete.length > 0) {
				await this.#persistence.inner.write(change);
				this.#persistence.emit(change);
			}
			await this.#state.ack(await this.#state.peek());
			await this.#state.setMeta({ onboarding: null });
		}
		await this.#state.setMeta({ userId, cursor: null });
	}

	#run(job: () => Promise<void>): Promise<void> {
		if (!this.#running) {
			return Promise.resolve();
		}
		const attempt = async () => {
			if (!this.#running || this.#userId === null) {
				return;
			}
			this.#setStatus("syncing");
			try {
				await withLock(job);
				this.#failures = 0;
				this.lastSyncedAt = Date.now();
				this.#setStatus("idle");
			} catch (error) {
				console.error("SyncEngine: sync failed", error);
				this.#setStatus("error");
				this.#scheduleRetry();
			}
		};
		this.#queue = this.#queue.then(attempt, attempt);
		return this.#queue;
	}

	async #push(): Promise<void> {
		if (this.#userId === null) {
			return;
		}
		const entries = await this.#state.peek();
		const onboarding = (await this.#state.getMeta()).onboarding;
		const pending = onboarding && !onboarding.synced ? onboarding : null;
		if (pending && entries.length === 0) {
			await this.#transport.push({
				put: [],
				delete: [],
				onboarding: pick(pending),
			});
			await this.#state.setMeta({ onboarding: { ...pending, synced: true } });
			return;
		}
		for (let at = 0; at < entries.length; at += PUSH_BATCH) {
			const batch = entries.slice(at, at + PUSH_BATCH);
			await this.#transport.push({
				onboarding: at === 0 && pending ? pick(pending) : undefined,
				put: batch
					.filter(
						(entry): entry is OutboxEntry & { kind: "put" } =>
							entry.kind === "put",
					)
					.map((entry) => entry.node),
				delete: batch
					.filter(
						(entry): entry is OutboxEntry & { kind: "delete" } =>
							entry.kind === "delete",
					)
					.map((entry) => ({ id: entry.id, deletedAt: entry.deletedAt })),
			});
			await this.#state.ack(batch);
			if (at === 0 && pending) {
				await this.#state.setMeta({ onboarding: { ...pending, synced: true } });
			}
		}
	}

	/**
	 * Pulls changes since the cursor, or everything when `full`. A full pull
	 * also drops local nodes the server no longer has, unless they have
	 * unpushed changes.
	 */
	async #pull(full = false): Promise<void> {
		if (this.#userId === null) {
			return;
		}
		let since = full ? null : (await this.#state.getMeta()).cursor;
		const serverIds = new Set<string>();
		let known = true;
		let onboardedAt: number | null = null;
		let response: PullResponse;
		do {
			response = await this.#transport.pull({ since });
			if (response.known === false) {
				known = false;
			}
			onboardedAt = response.onboardedAt ?? onboardedAt;
			for (const node of response.put) {
				serverIds.add(node.id);
			}
			const change = await this.#reconcile(response.put, response.delete);
			if (change.put.length > 0 || change.delete.length > 0) {
				await this.#persistence.inner.write(change);
				this.#persistence.emit(change);
			}
			if (response.cursor === null || response.cursor === since) {
				break;
			}
			await this.#state.setMeta({ cursor: response.cursor });
			since = response.cursor;
		} while (response.put.length + response.delete.length > 0);

		if (full) {
			await this.#prune(serverIds, known);
			if (onboardedAt !== null && !(await this.isOnboarded())) {
				await this.#state.setMeta({
					onboarding: { completedAt: onboardedAt, synced: true },
				});
			}
		}
	}

	/**
	 * Removes local nodes missing from the server. If the server doesn't know
	 * the workspace (e.g. its database was reset), nothing is removed and the
	 * local outline is queued to seed it instead.
	 */
	async #prune(serverIds: Set<string>, known: boolean): Promise<void> {
		const local = await this.#persistence.inner.load();
		if (!known) {
			await this.#state.enqueue(
				local.map((node): OutboxEntry => ({ id: node.id, kind: "put", node })),
			);
			return;
		}
		const pending = new Set(
			(await this.#state.peek()).map((entry) => entry.id),
		);
		const gone = local
			.filter((node) => !serverIds.has(node.id) && !pending.has(node.id))
			.map((node) => node.id);
		if (gone.length > 0) {
			const change: OutlineChange = { put: [], delete: gone };
			await this.#persistence.inner.write(change);
			this.#persistence.emit(change);
		}
	}

	/** Keeps the parts of a server change that are newer than what is stored locally. */
	async #reconcile(
		put: Node[],
		tombstones: Tombstone[],
	): Promise<OutlineChange> {
		const pending = new Map(
			(await this.#state.peek()).map((entry) => [entry.id, entry]),
		);
		const change: OutlineChange = { put: [], delete: [] };
		for (const node of put) {
			const local = await this.#localClock(node.id, pending);
			if (local === undefined || local < node.updatedAt) {
				change.put.push(node);
			}
		}
		for (const tombstone of tombstones) {
			const local = await this.#localClock(tombstone.id, pending);
			if (local !== undefined && local <= tombstone.deletedAt) {
				change.delete.push(tombstone.id);
			}
		}
		return change;
	}

	/** The local `updatedAt` for `id` (a queued delete counts as its `deletedAt`), or `undefined` if unknown. */
	async #localClock(
		id: string,
		pending: Map<string, OutboxEntry>,
	): Promise<number | undefined> {
		const entry = pending.get(id);
		if (entry?.kind === "delete") {
			return entry.deletedAt;
		}
		return (await this.#persistence.get(id))?.updatedAt;
	}

	#schedulePush(): void {
		if (!this.#running || this.#pushTimer) {
			return;
		}
		this.#pushTimer = setTimeout(() => {
			this.#pushTimer = null;
			void this.push();
		}, this.#pushDelayMs);
	}

	#schedulePull(): void {
		if (!this.#running) {
			return;
		}
		this.#pullTimer = setTimeout(() => {
			this.#pullTimer = null;
			void this.pull().finally(() => this.#schedulePull());
		}, this.#pullIntervalMs);
	}

	#scheduleRetry(): void {
		if (!this.#running || this.#retryTimer) {
			return;
		}
		const delay = Math.min(
			this.#backoffMs * 2 ** this.#failures,
			this.#maxBackoffMs,
		);
		this.#failures += 1;
		this.#retryTimer = setTimeout(() => {
			this.#retryTimer = null;
			void this.sync();
		}, delay);
	}

	#setStatus(status: SyncStatus): void {
		if (this.#status !== status) {
			this.#status = status;
			this.#onStatus?.(status);
			for (const listener of this.#statusListeners) {
				listener(status);
			}
		}
	}
}

function pick(record: OnboardingRecord): PushRequest["onboarding"] {
	return { completedAt: record.completedAt };
}

async function withLock(job: () => Promise<void>): Promise<void> {
	const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
	if (locks) {
		await locks.request(LOCK_NAME, job);
	} else {
		await job();
	}
}
