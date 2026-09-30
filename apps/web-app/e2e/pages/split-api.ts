import type { Page } from "@playwright/test";
import { fulfillResult, serverFnUrl } from "../server-fn.ts";
import { FeatureFlagsApi } from "./feature-flags-api.ts";

const FILE = "src/server/split.ts";

export interface SplitTaskStub {
	text: string;
	/** The verbatim phrase in the original line this task was pulled from. */
	source: string;
	due?: string | null;
	owner?: string | null;
}

/**
 * Stubs `src/server/split.ts`'s AI round-trip, which otherwise needs a real
 * Anthropic key. Routes must be registered before `outlinePage.goto()`, since
 * the feature flags load in the `/_app` route loader on first load.
 */
export class SplitApi {
	constructor(readonly page: Page) {}

	/** Reports AI as configured, so the split affordances render at all. */
	async enable() {
		await new FeatureFlagsApi(this.page).respond();
	}

	/** The next split call resolves with this title and these tasks. */
	async respond(title: string, tasks: SplitTaskStub[]) {
		await this.page.route(serverFnUrl(FILE, "splitIntoTasks"), (route) =>
			fulfillResult(route, {
				title,
				tasks: tasks.map((task) => ({ due: null, owner: null, ...task })),
			}),
		);
	}
}
