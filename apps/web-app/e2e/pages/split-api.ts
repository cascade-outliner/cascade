import { createHash } from "node:crypto";
import type { Page, Route } from "@playwright/test";
import { toCrossJSON } from "seroval";

// TanStack Start derives the RPC id from the server file + export name, but
// differently per mode: dev base64url-encodes them as JSON, production (CI)
// sha256-hashes `<app-relative file>--<handler>`.
export function serverFnUrl(
	exportName: string,
	file = "src/server/split.ts",
): (url: URL) => boolean {
	const handler = `${exportName}_createServerFn_handler`;
	const dev = Buffer.from(
		JSON.stringify({ file: `/${file}?tss-serverfn-split`, export: handler }),
	).toString("base64url");
	const prod = createHash("sha256").update(`${file}--${handler}`).digest("hex");
	return (url) =>
		url.pathname.endsWith(`/_serverFn/${dev}`) ||
		url.pathname.endsWith(`/_serverFn/${prod}`);
}

/** Fulfills a server function route with a successful, start-serialized result. */
export async function fulfillResult(route: Route, result: unknown) {
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
		await this.page.route(serverFnUrl("getAiConfig"), (route) =>
			fulfillResult(route, { enabled: true }),
		);
	}

	/** The next split call resolves with this title and these tasks. */
	async respond(title: string, tasks: SplitTaskStub[]) {
		await this.page.route(serverFnUrl("splitIntoTasks"), (route) =>
			fulfillResult(route, {
				title,
				tasks: tasks.map((task) => ({ due: null, owner: null, ...task })),
			}),
		);
	}
}
