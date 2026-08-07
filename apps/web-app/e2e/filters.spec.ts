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

const dayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

test.describe("filters", () => {
	// These tests mutate the shared e2e account's `hideCompletedByDefault`
	// setting and tag list, so they must not run concurrently with each other.
	test.describe.configure({ mode: "serial" });

	test("tag filter shows only nodes carrying the selected tag", async ({
		page,
		orpcClient,
	}) => {
		const uniqueSuffix = Date.now().toString();
		const tagName = `e2e-filter-tag-${uniqueSuffix}`;
		const root = await orpcClient.nodes.create({ parentId: null });

		try {
			await orpcClient.nodes.updateContent({
				id: root.id,
				content: lexicalContent(`Filters root ${uniqueSuffix}`),
			});
			await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

			const tagged = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: tagged.id,
				content: lexicalContent(`Has tag node ${uniqueSuffix}`),
			});
			await orpcClient.nodes.setTags({ id: tagged.id, tags: [tagName] });

			const untagged = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: untagged.id,
				content: lexicalContent(`No tag node ${uniqueSuffix}`),
			});

			const rootSlug = toNodeSlug({
				id: root.id,
				content: lexicalContent(`Filters root ${uniqueSuffix}`),
			});
			await page.goto(`/${rootSlug}`);

			await expect(treeRow(page, `Has tag node ${uniqueSuffix}`)).toBeVisible();
			await expect(treeRow(page, `No tag node ${uniqueSuffix}`)).toBeVisible();

			await page.getByRole("button", { name: "Filter", exact: true }).click();
			await page.getByRole("menuitem", { name: "Tags", exact: true }).click();
			await page.getByPlaceholder("Search tags…").fill(tagName);
			await page
				.getByLabel("Tags")
				.getByRole("button", { name: tagName })
				.click();
			await page.keyboard.press("Escape");
			await page.keyboard.press("Escape");

			await expect(page).toHaveURL(new RegExp(`tag=${tagName}`));
			await expect(treeRow(page, `Has tag node ${uniqueSuffix}`)).toBeVisible();
			await expect(treeRow(page, `No tag node ${uniqueSuffix}`)).toBeHidden();

			await page.getByRole("button", { name: "Clear filters" }).click();
			await expect(treeRow(page, `No tag node ${uniqueSuffix}`)).toBeVisible();
		} finally {
			await orpcClient.nodes.delete({ id: root.id });
			await orpcClient.nodes.deleteTag({ name: tagName }).catch(() => {});
		}
	});

	test("due-today and due-this-week filters show only matching nodes", async ({
		page,
		orpcClient,
	}) => {
		const uniqueSuffix = Date.now().toString();
		const root = await orpcClient.nodes.create({ parentId: null });

		try {
			await orpcClient.nodes.updateContent({
				id: root.id,
				content: lexicalContent(`Due filters root ${uniqueSuffix}`),
			});
			await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

			const dueToday = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: dueToday.id,
				content: lexicalContent(`Due today node ${uniqueSuffix}`),
			});
			await orpcClient.nodes.setDueDate({
				id: dueToday.id,
				dueDate: isoDate(daysFromNow(0)),
			});

			const dueFar = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: dueFar.id,
				content: lexicalContent(`Due far node ${uniqueSuffix}`),
			});
			await orpcClient.nodes.setDueDate({
				id: dueFar.id,
				dueDate: isoDate(daysFromNow(30)),
			});

			const rootSlug = toNodeSlug({
				id: root.id,
				content: lexicalContent(`Due filters root ${uniqueSuffix}`),
			});
			await page.goto(`/${rootSlug}`);

			await page.getByRole("button", { name: "Filter", exact: true }).click();
			await page.getByRole("menuitemcheckbox", { name: "Due today" }).click();

			await expect(page).toHaveURL(/filter=today/);
			await expect(
				treeRow(page, `Due today node ${uniqueSuffix}`),
			).toBeVisible();
			await expect(treeRow(page, `Due far node ${uniqueSuffix}`)).toBeHidden();

			await page
				.getByRole("button", { name: "Remove Due today filter" })
				.click();
			await page.getByRole("button", { name: "Filter", exact: true }).click();
			await page
				.getByRole("menuitemcheckbox", { name: "Due this week" })
				.click();

			await expect(page).toHaveURL(/filter=week/);
			await expect(
				treeRow(page, `Due today node ${uniqueSuffix}`),
			).toBeVisible();
			await expect(treeRow(page, `Due far node ${uniqueSuffix}`)).toBeHidden();
		} finally {
			await orpcClient.nodes.delete({ id: root.id });
		}
	});

	test("due-on-date and due-date-range filters via the calendar picker", async ({
		page,
		orpcClient,
	}) => {
		const uniqueSuffix = Date.now().toString();
		const root = await orpcClient.nodes.create({ parentId: null });

		try {
			await orpcClient.nodes.updateContent({
				id: root.id,
				content: lexicalContent(`Calendar filters root ${uniqueSuffix}`),
			});
			await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

			const dueTomorrow = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: dueTomorrow.id,
				content: lexicalContent(`Due tomorrow node ${uniqueSuffix}`),
			});
			await orpcClient.nodes.setDueDate({
				id: dueTomorrow.id,
				dueDate: isoDate(daysFromNow(1)),
			});

			const dueFar = await orpcClient.nodes.create({ parentId: root.id });
			await orpcClient.nodes.updateContent({
				id: dueFar.id,
				content: lexicalContent(`Due far node ${uniqueSuffix}`),
			});
			await orpcClient.nodes.setDueDate({
				id: dueFar.id,
				dueDate: isoDate(daysFromNow(30)),
			});

			const rootSlug = toNodeSlug({
				id: root.id,
				content: lexicalContent(`Calendar filters root ${uniqueSuffix}`),
			});
			await page.goto(`/${rootSlug}`);

			// Specific date: pick "Tomorrow" from the "Due on date" calendar.
			await page.getByRole("button", { name: "Filter", exact: true }).click();
			await page.getByRole("menuitem", { name: "Due on date" }).click();
			await page.getByRole("button", { name: "Tomorrow" }).click();
			await page.keyboard.press("Escape");
			await page.keyboard.press("Escape");

			await expect(page).toHaveURL(/due=/);
			await expect(
				treeRow(page, `Due tomorrow node ${uniqueSuffix}`),
			).toBeVisible();
			await expect(treeRow(page, `Due far node ${uniqueSuffix}`)).toBeHidden();

			await page
				.getByRole("button", { name: "Remove due date filter" })
				.click();

			// Range: click "Today" (the quick-pick shortcut, arming range-select
			// mode) then click a day-grid cell a week later to finalize the range —
			// the quick-pick row itself disappears once a start date is armed.
			const rangeEndLabel = dayFormatter.format(daysFromNow(7));
			await page.getByRole("button", { name: "Filter", exact: true }).click();
			await page.getByRole("menuitem", { name: "Due on date" }).click();
			const dueOnDateMenu = page.getByRole("menu", { name: "Due on date" });
			await dueOnDateMenu.getByRole("button", { name: "Today" }).click();
			await dueOnDateMenu
				.getByRole("button", { name: rangeEndLabel, exact: true })
				.click();

			await expect(page).toHaveURL(/due_start=.*due_end=/);
			await expect(
				treeRow(page, `Due tomorrow node ${uniqueSuffix}`),
			).toBeVisible();
			await expect(treeRow(page, `Due far node ${uniqueSuffix}`)).toBeHidden();

			await page
				.getByRole("button", { name: "Remove due date range filter" })
				.click();
			await expect(treeRow(page, `Due far node ${uniqueSuffix}`)).toBeVisible();
		} finally {
			await orpcClient.nodes.delete({ id: root.id });
		}
	});

	test("hide-completed filter hides completed tasks until removed", async ({
		page,
		orpcClient,
	}) => {
		const uniqueSuffix = Date.now().toString();
		const before = await orpcClient.settings.get();

		try {
			await orpcClient.settings.update({ hideCompletedByDefault: false });

			const root = await orpcClient.nodes.create({ parentId: null });
			try {
				await orpcClient.nodes.updateContent({
					id: root.id,
					content: lexicalContent(`Hide completed root ${uniqueSuffix}`),
				});
				await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

				const completedTask = await orpcClient.nodes.create({
					parentId: root.id,
				});
				await orpcClient.nodes.updateContent({
					id: completedTask.id,
					content: lexicalContent(`Completed task ${uniqueSuffix}`),
				});
				await orpcClient.nodes.setType({
					id: completedTask.id,
					type: "task",
					metadata: { completed: true },
				});

				const incompleteTask = await orpcClient.nodes.create({
					parentId: root.id,
				});
				await orpcClient.nodes.updateContent({
					id: incompleteTask.id,
					content: lexicalContent(`Incomplete task ${uniqueSuffix}`),
				});
				await orpcClient.nodes.setType({
					id: incompleteTask.id,
					type: "task",
					metadata: { completed: false },
				});

				const rootSlug = toNodeSlug({
					id: root.id,
					content: lexicalContent(`Hide completed root ${uniqueSuffix}`),
				});
				await page.goto(`/${rootSlug}`);

				await expect(
					treeRow(page, `Completed task ${uniqueSuffix}`),
				).toBeVisible();

				await page.getByRole("button", { name: "Filter", exact: true }).click();
				await page
					.getByRole("menuitemcheckbox", { name: "Hide completed" })
					.click();

				await expect(page).toHaveURL(/completed=hidden/);
				await expect(
					treeRow(page, `Completed task ${uniqueSuffix}`),
				).toBeHidden();
				await expect(
					treeRow(page, `Incomplete task ${uniqueSuffix}`),
				).toBeVisible();

				await page
					.getByRole("button", { name: "Remove Hide completed filter" })
					.click();
				await expect(
					treeRow(page, `Completed task ${uniqueSuffix}`),
				).toBeVisible();
			} finally {
				await orpcClient.nodes.delete({ id: root.id });
			}
		} finally {
			await orpcClient.settings.update({
				hideCompletedByDefault: before.hideCompletedByDefault,
			});
		}
	});
});
