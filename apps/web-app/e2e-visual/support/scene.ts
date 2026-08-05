import { toNodeSlug } from "@/features/nodes/model/node-slug";
import type { OrpcClient } from "./orpc-client";

function content(text: string) {
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

function pad(value: number): string {
	return value.toString().padStart(2, "0");
}

/**
 * Today's date as `YYYY-MM-DD`, read in UTC to match the visual suite's
 * fixed `timezoneId: "UTC"` browser context (playwright.visual.config.ts) —
 * using the same calendar day on both sides avoids a near-midnight mismatch
 * between this (Node-side) clock and the browser's. Deliberately "today"
 * rather than a fixed calendar date: the due-date pill's label/color bucket
 * depends on how many days out the date is (see
 * packages/outliner/src/dates/due-date-bucket.ts), so a fixed date would
 * silently drift from "upcoming" to "overdue" as real time passes and
 * produce a spurious diff against the baseline every day. "Today" always
 * renders the same "Today" pill.
 */
function todayCalendarDate(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

export interface VisualScene {
	/** Scratch root; deleting it cascades to every row created below. */
	rootId: string;
	/** `/$nodeSlug` path (no leading slash) for the root's detail page. */
	rootSlug: string;
	plainId: string;
	taskOpenId: string;
	taskDoneId: string;
	dueDateId: string;
	taggedId: string;
	iconId: string;
}

/**
 * Builds one small scratch subtree exercising the states #596 asks to be
 * screenshotted: a default text row, an open and a completed task, a row
 * with a due date, a row with tag pills, and a row with an emoji icon.
 * Scoped under its own root (rather than the account's top-level tree) so a
 * spec can navigate straight to it and screenshot only these rows, unaffected
 * by whatever else exists in the shared visual-harness account.
 */
export async function buildVisualScene(
	orpcClient: OrpcClient,
	label: string,
): Promise<VisualScene> {
	const root = await orpcClient.nodes.create({ parentId: null });
	const rootContent = content(`Visual scene ${label}`);
	await orpcClient.nodes.updateContent({ id: root.id, content: rootContent });
	await orpcClient.nodes.toggleExpanded({ id: root.id, expanded: true });

	const plain = await orpcClient.nodes.create({ parentId: root.id });
	await orpcClient.nodes.updateContent({
		id: plain.id,
		content: content("Plain outline row"),
	});

	const taskOpen = await orpcClient.nodes.create({
		parentId: root.id,
		afterId: plain.id,
	});
	await orpcClient.nodes.updateContent({
		id: taskOpen.id,
		content: content("Open task"),
	});
	await orpcClient.nodes.setType({
		id: taskOpen.id,
		type: "task",
		metadata: { completed: false },
	});

	const taskDone = await orpcClient.nodes.create({
		parentId: root.id,
		afterId: taskOpen.id,
	});
	await orpcClient.nodes.updateContent({
		id: taskDone.id,
		content: content("Completed task"),
	});
	await orpcClient.nodes.setType({
		id: taskDone.id,
		type: "task",
		metadata: { completed: true },
	});

	const dueDate = await orpcClient.nodes.create({
		parentId: root.id,
		afterId: taskDone.id,
	});
	await orpcClient.nodes.updateContent({
		id: dueDate.id,
		content: content("Row due today"),
	});
	await orpcClient.nodes.setDueDate({
		id: dueDate.id,
		dueDate: todayCalendarDate(),
	});

	const tagged = await orpcClient.nodes.create({
		parentId: root.id,
		afterId: dueDate.id,
	});
	await orpcClient.nodes.updateContent({
		id: tagged.id,
		content: content("Row with tags"),
	});
	await orpcClient.nodes.setTags({ id: tagged.id, tags: ["design", "urgent"] });

	const icon = await orpcClient.nodes.create({
		parentId: root.id,
		afterId: tagged.id,
	});
	await orpcClient.nodes.updateContent({
		id: icon.id,
		content: content("Row with an emoji icon"),
	});
	await orpcClient.nodes.setIcon({ id: icon.id, icon: "🔥" });

	return {
		rootId: root.id,
		rootSlug: toNodeSlug({ id: root.id, content: rootContent }),
		plainId: plain.id,
		taskOpenId: taskOpen.id,
		taskDoneId: taskDone.id,
		dueDateId: dueDate.id,
		taggedId: tagged.id,
		iconId: icon.id,
	};
}

export async function destroyVisualScene(
	orpcClient: OrpcClient,
	scene: VisualScene,
): Promise<void> {
	await orpcClient.nodes.delete({ id: scene.rootId });
}
