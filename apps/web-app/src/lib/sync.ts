import {
	getOrCreateWorkspaceId,
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
	/** The anonymous id this browser syncs under, created on first call. */
	workspaceId(): Promise<string>;
	/** Records the finished onboarding; the background job sends it to the server. */
	recordOnboarding(template: string): Promise<void>;
	/** Starts the background job if the server has a database; otherwise stays disabled. */
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

	return {
		persistence,
		engine,
		workspaceId: () => getOrCreateWorkspaceId(state),
		recordOnboarding: (template) => engine.recordOnboarding(template),
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
