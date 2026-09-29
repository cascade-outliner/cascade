import type { Locator, Page } from "@playwright/test";

/** The menu that opens on "/" in a row or the capture bar: commands, narrowed by what's typed after the slash. */
export class SlashMenu {
	readonly menu: Locator;
	readonly options: Locator;
	readonly highlighted: Locator;

	constructor(readonly page: Page) {
		this.menu = page.getByTestId("slash-menu");
		this.options = this.menu.getByRole("option");
		this.highlighted = this.menu.getByRole("option", { selected: true });
	}

	/** The editable text of `row`. */
	editor(row: Locator): Locator {
		return row.getByTestId("outliner-content");
	}

	/** Puts the caret at the end of `row` and types " /query" there. */
	async openIn(row: Locator, query = "") {
		const editor = this.editor(row);
		await editor.click();
		await editor.press("End");
		await editor.pressSequentially(` /${query}`);
	}

	option(name: string): Locator {
		return this.menu.getByRole("option", { name, exact: true });
	}
}
