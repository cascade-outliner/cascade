import {
	IdbPersistence,
	IdbSyncState,
	openCascadeDb,
	type PullResponse,
	SyncEngine,
	SyncedPersistence,
} from "@cascade/data";
import { getSyncConfig, pullChanges, pushChanges } from "#/server/sync.ts";

export interface Sync {
	persistence: SyncedPersistence;
	engine: SyncEngine;
	/** Starts the background job if the server has a database; otherwise stays disabled. */
	start(): Promise<void>;
	stop(): void;
}

export function createSync(): Sync {
	const db = openCascadeDb();
	const persistence = new SyncedPersistence(
		new IdbPersistence(undefined, db),
		new IdbSyncState(db),
	);
	const engine = new SyncEngine({
		persistence,
		state: new IdbSyncState(db),
		transport: {
			push: (data) => pushChanges({ data }),
			pull: async (data) =>
				(await pullChanges({ data })) as unknown as PullResponse,
		},
	});

	return {
		persistence,
		engine,
		async start() {
			if (typeof window === "undefined") {
				return;
			}
			try {
				const { enabled } = await getSyncConfig();
				if (enabled) {
					await engine.start();
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
