import type { Locator, Page } from "@playwright/test";

export class OutlinePage {
	readonly outline: Locator;
	readonly rows: Locator;
	readonly captureInput: Locator;
	/** Slash commands picked in the capture bar, waiting for its text to be submitted. */
	readonly captureChips: Locator;
	readonly addButton: Locator;
	/** The "+" that opens the capture commands without typing a slash. */
	readonly captureMenuButton: Locator;
	/** Only there while AI is configured and the capture bar has text to split. */
	readonly captureSplitButton: Locator;
	readonly emptyState: Locator;
	/** The zoomed-in node's title; only there when zoomed in. */
	readonly title: Locator;

	constructor(readonly page: Page) {
		this.outline = page.getByTestId("outliner-list");
		this.rows = this.outline.getByTestId("outliner-row");
		this.captureInput = page.getByTestId("capture-bar-input");
		this.captureChips = page.getByTestId("capture-bar-chip");
		this.addButton = page.getByTestId("capture-bar-submit");
		this.captureMenuButton = page.getByTestId("capture-bar-plus");
		this.captureSplitButton = page.getByTestId("capture-bar-split");
		this.emptyState = page.getByTestId("outline-empty");
		this.title = page.getByRole("heading", { level: 1 });
	}

	async goto(path = "/") {
		await this.page.goto(path);
		await this.captureInput.waitFor();
	}

	/** Adds a node through the capture bar (a one-line editor), submitting with Enter. */
	async addNode(text: string) {
		await this.captureInput.fill(text);
		await this.captureInput.press("Enter");
	}

	/**
	 * Whether a node containing `text` has reached IndexedDB. Store writes are
	 * fire-and-forget, so poll this before a reload:
	 * `await expect.poll(() => outlinePage.isSaved("x")).toBe(true)`.
	 */
	isSaved(text: string): Promise<boolean> {
		return this.page.evaluate(
			(text) =>
				new Promise<boolean>((resolve, reject) => {
					const open = indexedDB.open("cascade");
					open.onerror = () => reject(open.error);
					open.onsuccess = () => {
						const db = open.result;
						const all = db.transaction("nodes").objectStore("nodes").getAll();
						all.onerror = () => reject(all.error);
						all.onsuccess = () => {
							db.close();
							resolve(
								all.result.some((node) =>
									JSON.stringify(node.content).includes(text),
								),
							);
						};
					};
				}),
			text,
		);
	}

	/** The row whose content contains `text` (user data, not UI copy). */
	row(text: string): Locator {
		return this.rows.filter({ hasText: text });
	}

	/** The due date pill on the row containing `text`. */
	duePill(text: string): Locator {
		return this.row(text).getByTestId("due-pill");
	}

	/** A "due elsewhere" section under today's note, e.g. "Tomorrow". */
	dueGroup(name: string): Locator {
		return this.page.getByRole("region", { name, exact: true });
	}
}
