import {
	IdbPersistence,
	IdbSyncState,
	openCascadeDb,
	type PullResponse,
	SyncEngine,
	SyncedPersistence,
} from "@cascade/data";
import {
	getSyncConfig,
	pullChanges,
	pushChanges,
	type SyncConfig,
} from "#/server/sync.ts";

export interface Sync {
	persistence: SyncedPersistence;
	engine: SyncEngine;
	/** What the server answered on `start`, or `null` until it did. */
	readonly config: SyncConfig | null;
	subscribeConfig(listener: () => void): () => void;
	/** Records the finished onboarding; the background job sends it to the server. */
	recordOnboarding(): Promise<void>;
	isOnboarded(): Promise<boolean>;
	/** Starts the background job when the server can sync and the user is signed in; otherwise stays disabled. */
	start(): Promise<void>;
	stop(): void;
}

export function createSync(): Sync {
	const db = openCascadeDb();
	const state = new IdbSyncState(db);
	const persistence = new SyncedPersistence(
		new IdbPersistence(undefined, db),
		state,
	);
	const engine = new SyncEngine({
		persistence,
		state,
		transport: {
			push: (data) => pushChanges({ data }),
			pull: async (data) =>
				(await pullChanges({ data })) as unknown as PullResponse,
		},
	});
	let config: SyncConfig | null = null;
	const listeners = new Set<() => void>();

	return {
		persistence,
		engine,
		get config() {
			return config;
		},
		subscribeConfig(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		recordOnboarding: () => engine.recordOnboarding(),
		isOnboarded: () => engine.isOnboarded(),
		async start() {
			try {
				config = await getSyncConfig();
				for (const listener of listeners) {
					listener();
				}
				if (config.user) {
					await engine.start(config.user.id);
				}
			} catch (error) {
				console.error("Sync: could not reach the server, staying local", error);
			}
		},
		stop() {
			engine.stop();
		},
	};
}
