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
import { getOrCreateWorkspaceId, isWorkspaceId } from "./workspace.ts";

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
	#workspaceId: string | null = null;
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

	get workspaceId(): string | null {
		return this.#workspaceId;
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

	/**
	 * Switches this browser to an existing workspace, e.g. one pasted from
	 * another device. Resets the pull cursor so its nodes are pulled in full;
	 * pending local changes are pushed to the new workspace.
	 */
	async setWorkspaceId(workspaceId: string): Promise<void> {
		if (!isWorkspaceId(workspaceId)) {
			throw new Error(`Not a workspace id: ${workspaceId}`);
		}
		await this.#state.setMeta({ workspaceId, cursor: null });
		this.#workspaceId = workspaceId;
		await this.sync();
	}

	/** Starts syncing; resolves once the first sync settles, also for repeat callers. */
	start(): Promise<void> {
		if (!this.#running) {
			this.#running = true;
			this.#started = this.#start();
		}
		return this.#started;
	}

	async #start(): Promise<void> {
		this.#setStatus("idle");
		this.#persistence.onWrite = () => this.#schedulePush();

		this.#workspaceId = await getOrCreateWorkspaceId(this.#state);

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

	#run(job: () => Promise<void>): Promise<void> {
		if (!this.#running) {
			return Promise.resolve();
		}
		const attempt = async () => {
			if (!this.#running || this.#workspaceId === null) {
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
		const workspaceId = this.#workspaceId;
		if (workspaceId === null) {
			return;
		}
		const entries = await this.#state.peek();
		const onboarding = (await this.#state.getMeta()).onboarding;
		const pending = onboarding && !onboarding.synced ? onboarding : null;
		if (pending && entries.length === 0) {
			await this.#transport.push({
				workspaceId,
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
				workspaceId,
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
		const workspaceId = this.#workspaceId;
		if (workspaceId === null) {
			return;
		}
		let since = full ? null : (await this.#state.getMeta()).cursor;
		const serverIds = new Set<string>();
		let known = true;
		let response: PullResponse;
		do {
			response = await this.#transport.pull({ workspaceId, since });
			if (response.known === false) {
				known = false;
			}
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
