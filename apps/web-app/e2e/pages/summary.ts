import type { Locator, Page } from "@playwright/test";
import { fulfillResult, serverFnUrl } from "./split-api.ts";

export interface SummarySentenceStub {
	text: string;
	/** Numbers of the zoomed node's children the sentence came from, from 1. */
	sources?: number[];
	status?: "done" | "progress" | "blocked" | null;
}

/** The summary under a zoomed-in node's title (5b), and its stubbed AI round-trip. */
export class Summary {
	readonly trigger: Locator;
	readonly card: Locator;
	readonly text: Locator;

	constructor(readonly page: Page) {
		this.trigger = page.getByTestId("summarize");
		this.card = page.getByTestId("summary");
		this.text = this.card.getByTestId("summary-text");
	}

	/** Every summarize call resolves with these sentences. */
	async respond(sentences: SummarySentenceStub[]) {
		await this.page.route(
			serverFnUrl("summarizeBranch", "src/server/summarize.ts"),
			(route) =>
				fulfillResult(route, {
					sentences: sentences.map((sentence) => ({
						sources: [],
						status: null,
						...sentence,
					})),
				}),
		);
	}

	action(name: string): Locator {
		return this.card.getByRole("button", { name, exact: true });
	}

	/** A cited branch under the summary, e.g. "Launch checklist". */
	source(name: string): Locator {
		return this.card.getByRole("button", { name: new RegExp(name) });
	}
}
