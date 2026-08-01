import type { Page } from "@playwright/test";

/**
 * A tree row's accessible name is built from its child buttons' static
 * aria-labels ("Drag to reorder", "Open node", "Edit node text", ...), not
 * its actual node text — those labels override their own elements' text
 * content in the accessible-name computation. Match on rendered text instead.
 */
export function treeRow(page: Page, text: string) {
	return page.locator('[role="treeitem"]').filter({ hasText: text });
}
