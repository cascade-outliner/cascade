import { randomUUID } from "node:crypto";
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
import type {
	OnboardingSampleNodeIds,
	OnboardingSampleNodeKey,
} from "@/features/settings/model/settings.schema";
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
	/** Present only for nodes the onboarding tour spotlights with its own
	 * driver.js step (see `onboardingSteps`); used as the node's explicit id
	 * so the tour can build a stable `[id="..."]` selector for it. */
	anchorKey?: OnboardingSampleNodeKey;
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

// Short, self-explanatory node text: the onboarding tour (see
// `onboardingSteps`) carries the actual explanations as driver.js popovers
// anchored to these nodes, rather than duplicating that copy here.
function childDefs(): WelcomeNodeDef[] {
	return [
		{
			anchorKey: "createNode",
			content: paragraph(
				"Try editing this node, or press Enter to add one below it.",
			),
		},
		{
			anchorKey: "indentNode",
			content: paragraph(
				"Drag me, or press Tab / Shift+Tab to indent and outdent.",
			),
		},
		{
			anchorKey: "focusDot",
			content: paragraph("Click the dot to the left of this node to open it."),
		},
		{
			anchorKey: "task",
			content: paragraph("A task — click the checkbox."),
			type: "task",
		},
		{
			anchorKey: "tagged",
			content: paragraph("Tagged, and due tomorrow."),
			dueDate: tomorrowDateString(),
			tags: ["example"],
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
		const rootId = randomUUID();
		const [rootOrder] = generateNKeysBetween(null, null, 1);
		await transaction.insert(nodes).values({
			id: rootId,
			userId,
			parentId: null,
			order: rootOrder,
			content: ROOT_CONTENT,
			searchText: nodeSearchText(ROOT_CONTENT),
			expanded: true,
		});

		const defs = childDefs();
		const childIds = defs.map(() => randomUUID());
		const childOrders = generateNKeysBetween(null, null, defs.length);
		await transaction.insert(nodes).values(
			defs.map((def, index) => ({
				id: childIds[index],
				userId,
				parentId: rootId,
				order: childOrders[index],
				content: def.content,
				searchText: nodeSearchText(def.content),
				type: nodeType(def),
				metadata: def.type === "task" ? { completed: false } : null,
				dueDate: def.dueDate ?? null,
			})),
		);

		const taggedChildren = defs
			.map((def, index) => ({ def, nodeId: childIds[index] }))
			.filter((entry) => (entry.def.tags?.length ?? 0) > 0);
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

		const sampleNodeIds: OnboardingSampleNodeIds = {};
		for (const [index, def] of defs.entries()) {
			if (def.anchorKey) sampleNodeIds[def.anchorKey] = childIds[index];
		}

		await transaction
			.insert(userSettings)
			.values({
				userId,
				settings: {
					onboardingCompleted: false,
					onboardingSampleNodeIds: sampleNodeIds,
				},
			})
			.onConflictDoNothing({ target: userSettings.userId });
	});
}
