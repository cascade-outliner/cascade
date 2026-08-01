import type { Page } from "@playwright/test";
import { toNodeSlug } from "@/features/nodes/model/node-slug";
import { expect, test } from "./support/fixtures";
import { treeRow } from "./support/tree-row";

function lexicalContent(text: string) {
	return {
		root: {
			type: "root" as const,
			children: [
				{
					type: "paragraph" as const,
					children: [{ type: "text" as const, text }],
				},
			],
		},
	};
}

function isoDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysFromNow(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});

/** A base-ui Select popup keeps a closed popup's options in the DOM briefly
 * during its exit transition; scoping to `:visible` disambiguates which
 * "Daily"/"Weekly"/... option a later click means (see user-settings.spec.ts). */
function visibleOption(page: Page, name: string) {
	return page.getByRole("option", { name }).and(page.locator(":visible"));
}

test("sets a due date via the context menu, then sets a recurring due date and a custom interval", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Due date root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const task = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: task.id,
			content: lexicalContent(`Due date task ${uniqueSuffix}`),
		});
		await orpcClient.nodes.setType({
			id: task.id,
			type: "task",
			metadata: { completed: false },
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Due date root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		const row = treeRow(page, `Due date task ${uniqueSuffix}`);
		await row.click({ button: "right" });
		await page.getByRole("menuitem", { name: "Set date" }).click();
		await page.getByRole("button", { name: "Tomorrow" }).click();

		await expect
			.poll(async () => (await orpcClient.nodes.get({ id: task.id })).dueDate)
			.toBe(isoDate(daysFromNow(1)));

		// The recurrence picker is enabled now that the task has a due date, in
		// the same still-open popup.
		await page.getByRole("combobox", { name: "Repeat" }).click({ force: true });
		await visibleOption(page, "Daily").click({ force: true });

		await expect
			.poll(
				async () => (await orpcClient.nodes.get({ id: task.id })).recurrence,
			)
			.toEqual({ unit: "day", interval: 1, anchorDay: expect.any(Number) });

		// Switching to a custom interval requires filling the interval and
		// picking a unit before it applies (no auto-apply, unlike the presets).
		await page.getByRole("combobox", { name: "Repeat" }).click({ force: true });
		await visibleOption(page, "Custom").click({ force: true });
		await page.getByLabel("Every").fill("3");
		await page
			.getByRole("combobox", { name: "Repeat unit" })
			.click({ force: true });
		await visibleOption(page, "weeks").click({ force: true });
		await page.getByRole("button", { name: "Apply" }).click();

		await expect
			.poll(
				async () => (await orpcClient.nodes.get({ id: task.id })).recurrence,
			)
			.toEqual({ unit: "week", interval: 3, anchorDay: expect.any(Number) });
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("completing a recurring task advances its due date to the next occurrence instead of marking it done", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Recurring root ${uniqueSuffix}`),
		});
		await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

		const task = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: task.id,
			content: lexicalContent(`Recurring task ${uniqueSuffix}`),
		});
		await orpcClient.nodes.setType({
			id: task.id,
			type: "task",
			metadata: { completed: false },
		});
		await orpcClient.nodes.setDueDate({
			id: task.id,
			dueDate: isoDate(daysFromNow(0)),
		});
		await orpcClient.nodes.setRecurrence({
			id: task.id,
			recurrence: { unit: "day", interval: 1 },
		});

		const rootSlug = toNodeSlug({
			id: root.id,
			content: lexicalContent(`Recurring root ${uniqueSuffix}`),
		});
		await page.goto(`/${rootSlug}`);

		const row = treeRow(page, `Recurring task ${uniqueSuffix}`);
		await row.getByRole("checkbox", { name: "Task completed" }).click();

		const nextDue = shortDateFormatter.format(daysFromNow(1));
		await expect(
			page.getByText(`Completed — next due ${nextDue}`),
		).toBeVisible();
		await expect(
			row.getByRole("checkbox", { name: "Task completed" }),
		).not.toBeChecked();

		await expect
			.poll(async () => {
				const node = await orpcClient.nodes.get({ id: task.id });
				return { dueDate: node.dueDate, completed: node.metadata?.completed };
			})
			.toEqual({ dueDate: isoDate(daysFromNow(1)), completed: false });
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
