import type { NodeTypeName } from "@cascade/outliner/node-types";
import { sql } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";
import { db } from "@/db";
import { nodeSearchText } from "@/features/nodes/model/node-search-text";
import {
	nodes,
	nodeTags,
	tags,
} from "@/features/nodes/server/persistence/node-tables";
import { userSettings } from "@/features/settings/server/settings-table";

type SeedLexicalContent = ReturnType<typeof paragraph>;

function paragraph(text: string) {
	return {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text" as const,
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	};
}

interface WelcomeNodeDef {
	content: SeedLexicalContent;
	type?: "task";
	dueDate?: string;
	tags?: string[];
}

function nodeType(def: WelcomeNodeDef): NodeTypeName {
	return def.type ?? "text";
}

function tomorrowDateString(): string {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return date.toISOString().slice(0, 10);
}

const ROOT_CONTENT = paragraph(
	"👋 Welcome to Cascade — this is an example outline to show you around",
);

function childDefs(): WelcomeNodeDef[] {
	return [
		{
			content: paragraph(
				"Press Enter at the end of a node to create a new one below it, or click “Add node” at the bottom of the outline.",
			),
		},
		{
			content: paragraph(
				"Press Tab to indent a node under the one above it, Shift+Tab to outdent, or drag a row to reorder or re-parent it. Try it on this node!",
			),
		},
		{
			content: paragraph("This is a task — click the checkbox to complete it."),
			type: "task",
		},
		{
			content: paragraph(
				"This node has a tag and a due date. Open Filters above the outline to filter by either.",
			),
			dueDate: tomorrowDateString(),
			tags: ["example"],
		},
		{
			content: paragraph(
				"Press Cmd/Ctrl+K anytime to jump straight to any node by name (Quick Open).",
			),
		},
		{
			content: paragraph(
				"Press ? anytime to see the full keyboard shortcuts reference.",
			),
		},
		{
			content: paragraph(
				"This whole outline is just example content — delete this node (and its children go with it) whenever you're ready.",
			),
		},
	];
}

/**
 * Seeds a small, hand-authored starter tree for a brand-new user and marks
 * the onboarding tour as not yet completed. Called once from the sign-up
 * database hook (see `packages/auth`'s `onUserCreated`), never for existing
 * users, so it never runs twice for the same account.
 */
export async function seedOnboardingContent(userId: string): Promise<void> {
	await db.transaction(async (transaction) => {
		const [rootOrder] = generateNKeysBetween(null, null, 1);
		const [root] = await transaction
			.insert(nodes)
			.values({
				userId,
				parentId: null,
				order: rootOrder,
				content: ROOT_CONTENT,
				searchText: nodeSearchText(ROOT_CONTENT),
				expanded: true,
			})
			.returning({ id: nodes.id });

		const defs = childDefs();
		const childOrders = generateNKeysBetween(null, null, defs.length);
		const insertedChildren = await transaction
			.insert(nodes)
			.values(
				defs.map((def, index) => ({
					userId,
					parentId: root.id,
					order: childOrders[index],
					content: def.content,
					searchText: nodeSearchText(def.content),
					type: nodeType(def),
					metadata: def.type === "task" ? { completed: false } : null,
					dueDate: def.dueDate ?? null,
				})),
			)
			.returning({ id: nodes.id });

		const taggedChildren = defs
			.map((def, index) => ({ def, nodeId: insertedChildren[index]?.id }))
			.filter(
				(entry): entry is { def: WelcomeNodeDef; nodeId: string } =>
					entry.nodeId !== undefined && (entry.def.tags?.length ?? 0) > 0,
			);
		for (const { def, nodeId } of taggedChildren) {
			// def.tags is guaranteed non-empty by the filter above.
			// biome-ignore lint/style/noNonNullAssertion: filtered for non-empty tags above
			const tagNames = def.tags!;
			const tagIds = (
				await transaction
					.insert(tags)
					.values(tagNames.map((name) => ({ userId, name })))
					.onConflictDoUpdate({
						target: [tags.userId, tags.name],
						set: { name: sql`excluded.name` },
					})
					.returning({ id: tags.id })
			).map(({ id }) => id);
			await transaction
				.insert(nodeTags)
				.values(tagIds.map((tagId) => ({ nodeId, tagId })));
		}

		await transaction
			.insert(userSettings)
			.values({ userId, settings: { onboardingCompleted: false } })
			.onConflictDoNothing({ target: userSettings.userId });
	});
}
