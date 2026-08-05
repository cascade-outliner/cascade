import { expect, test } from "./support/fixtures";

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

test("groups dated nodes into Overdue/Today/Upcoming and hides completed tasks by default", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		const overdueTask = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: overdueTask.id,
			content: lexicalContent(`Agenda overdue task ${uniqueSuffix}`),
		});
		await orpcClient.nodes.setType({
			id: overdueTask.id,
			type: "task",
			metadata: { completed: false },
		});
		await orpcClient.nodes.setDueDate({
			id: overdueTask.id,
			dueDate: isoDate(daysFromNow(-2)),
		});

		const todayTask = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: todayTask.id,
			content: lexicalContent(`Agenda today task ${uniqueSuffix}`),
		});
		await orpcClient.nodes.setType({
			id: todayTask.id,
			type: "task",
			metadata: { completed: false },
		});
		await orpcClient.nodes.setDueDate({
			id: todayTask.id,
			dueDate: isoDate(daysFromNow(0)),
		});

		const completedTask = await orpcClient.nodes.create({
			parentId: root.id,
		});
		await orpcClient.nodes.updateContent({
			id: completedTask.id,
			content: lexicalContent(`Agenda completed task ${uniqueSuffix}`),
		});
		await orpcClient.nodes.setType({
			id: completedTask.id,
			type: "task",
			metadata: { completed: true },
		});
		await orpcClient.nodes.setDueDate({
			id: completedTask.id,
			dueDate: isoDate(daysFromNow(0)),
		});

		await page.goto("/");
		await page.getByRole("button", { name: "Agenda" }).click();

		const overdueSection = page.getByRole("region", { name: "Overdue" });
		await expect(
			overdueSection.getByText(`Agenda overdue task ${uniqueSuffix}`),
		).toBeVisible();

		const todaySection = page.getByRole("region", { name: "Today" });
		await expect(
			todaySection.getByText(`Agenda today task ${uniqueSuffix}`),
		).toBeVisible();

		await expect(
			page.getByText(`Agenda completed task ${uniqueSuffix}`),
		).toHaveCount(0);

		await page.getByRole("checkbox", { name: "Hide completed" }).click();
		await expect(
			todaySection.getByText(`Agenda completed task ${uniqueSuffix}`),
		).toBeVisible();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});

test("clicking an agenda row navigates to the node in its tree context", async ({
	page,
	orpcClient,
}) => {
	const uniqueSuffix = Date.now().toString();
	const root = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: root.id,
			content: lexicalContent(`Agenda click-through root ${uniqueSuffix}`),
		});
		const task = await orpcClient.nodes.create({ parentId: root.id });
		await orpcClient.nodes.updateContent({
			id: task.id,
			content: lexicalContent(`Agenda click-through task ${uniqueSuffix}`),
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

		await page.goto("/");
		await page.getByRole("button", { name: "Agenda" }).click();
		await page.getByText(`Agenda click-through task ${uniqueSuffix}`).click();

		await expect(
			page.getByRole("navigation", { name: "Breadcrumb" }),
		).toBeVisible();
		await expect(
			page.getByText(`Agenda click-through root ${uniqueSuffix}`),
		).toBeVisible();
		await expect(
			page.getByRole("dialog", { name: "Agenda" }),
		).not.toBeVisible();
	} finally {
		await orpcClient.nodes.delete({ id: root.id });
	}
});
