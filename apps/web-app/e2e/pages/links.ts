import type { Locator, Page } from "@playwright/test";

export class Links {
	readonly dialog: Locator;
	readonly urlInput: Locator;
	readonly textInput: Locator;
	readonly submit: Locator;
	readonly error: Locator;

	constructor(readonly page: Page) {
		this.dialog = page.getByRole("dialog");
		this.urlInput = page.getByTestId("link-dialog-url");
		this.textInput = page.getByTestId("link-dialog-text");
		this.submit = page.getByTestId("link-dialog-submit");
		this.error = page.getByTestId("link-dialog-error");
	}

	editor(row: Locator): Locator {
		return row.getByTestId("outliner-content");
	}

	anchors(row: Locator): Locator {
		return this.editor(row).locator("a");
	}

	openButtons(row: Locator): Locator {
		return row.getByTestId("link-open");
	}
}
