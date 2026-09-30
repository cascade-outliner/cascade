import type { Page } from "@playwright/test";
import { fulfillResult, serverFnUrl } from "../server-fn.ts";

const FILE = "src/server/feature-flags.ts";

export interface ServerFlagStub {
	value: boolean;
	reason: string;
}

export type ServerFlagsStub = Record<string, ServerFlagStub | null>;

const UNPINNED: ServerFlagsStub = {
	aiSplit: null,
	slashCommands: null,
	dueElsewhere: null,
};

export class FeatureFlagsApi {
	constructor(readonly page: Page) {}

	async respond(pinned: ServerFlagsStub = {}) {
		await this.page.route(serverFnUrl(FILE, "getFeatureFlags"), (route) =>
			fulfillResult(route, { ...UNPINNED, ...pinned }),
		);
	}

	/** Writes the user's overrides to IndexedDB, as a settings UI would. Needs a loaded page; takes effect on the next load. */
	async setOverrides(overrides: Record<string, unknown>) {
		await this.page.evaluate(
			(value) =>
				new Promise<void>((resolve, reject) => {
					const open = indexedDB.open("cascade");
					open.onerror = () => reject(open.error);
					open.onsuccess = () => {
						const tx = open.result.transaction("preferences", "readwrite");
						tx.objectStore("preferences").put({ key: "featureFlags", value });
						tx.onerror = () => reject(tx.error);
						tx.oncomplete = () => {
							open.result.close();
							resolve();
						};
					};
				}),
			overrides,
		);
	}
}
