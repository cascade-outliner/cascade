import type { Page, Route } from "@playwright/test";
import { toCrossJSON } from "seroval";

// The RPC id TanStack Start derives from the server file + export name; stable
// across dev and production builds, so it's safe to hardcode.
const FILE = "/src/server/split.ts?tss-serverfn-split";

function serverFnGlob(exportName: string): string {
	const id = { file: FILE, export: `${exportName}_createServerFn_handler` };
	return `**/_serverFn/${Buffer.from(JSON.stringify(id)).toString("base64url")}`;
}

/** Fulfills a server function route with a successful, start-serialized result. */
async function fulfillResult(route: Route, result: unknown) {
	await route.fulfill({
		contentType: "application/json",
		headers: { "x-tss-serialized": "true" },
		body: JSON.stringify(
			toCrossJSON({ result, error: undefined, context: {} }),
		),
	});
}

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
 * `getAiConfig` runs in the `/_app` route loader on first load.
 */
export class SplitApi {
	constructor(readonly page: Page) {}

	/** Reports AI as configured, so the split affordances render at all. */
	async enable() {
		await this.page.route(serverFnGlob("getAiConfig"), (route) =>
			fulfillResult(route, { enabled: true }),
		);
	}

	/** The next split call resolves with this title and these tasks. */
	async respond(title: string, tasks: SplitTaskStub[]) {
		await this.page.route(serverFnGlob("splitIntoTasks"), (route) =>
			fulfillResult(route, {
				title,
				tasks: tasks.map((task) => ({ due: null, owner: null, ...task })),
			}),
		);
	}
}
