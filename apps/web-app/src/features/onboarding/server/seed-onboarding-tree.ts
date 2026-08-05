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
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import {
	type OnboardingSampleNodeIds,
	onboardingAnchoredNodeKeys,
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

export interface WelcomeNodeDef {
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
// anchored to these nodes, rather than duplicating that copy here. Keyed by
// `OnboardingSampleNodeKey` (minus `root`) so a tour replay can rebuild just
// the one node a user deleted, not the whole tree — see
// `ensureOnboardingSampleTree`.
export const anchoredChildDefs: Record<
	(typeof onboardingAnchoredNodeKeys)[number],
	WelcomeNodeDef
> = {
	createNode: {
		content: paragraph(
			"Try editing this node, or press Enter to add one below it.",
		),
	},
	indentNode: {
		content: paragraph(
			"Drag me, or press Tab / Shift+Tab to indent and outdent.",
		),
	},
	focusDot: {
		content: paragraph("Click the dot to the left of this node to open it."),
	},
	task: {
		content: paragraph("A task — click the checkbox."),
		type: "task",
	},
	tagged: {
		content: paragraph("Tagged, and due tomorrow."),
		dueDate: tomorrowDateString(),
		tags: ["example"],
	},
};

const deleteHintDef: WelcomeNodeDef = {
	content: paragraph(
		"This whole outline is just example content — delete this node (and its children go with it) whenever you're ready.",
	),
};

/** Inserts one onboarding node (plus its tags, if any) as a child of
 * `parentId` at `order`, returning its id. Used both for the initial full
 * seed and for adding back a single node a user deleted (see
 * `ensureOnboardingSampleTree`) — never touches any other node. */
export async function insertOnboardingChild(
	transaction: NodeTransaction,
	userId: string,
	parentId: string,
	order: string,
	def: WelcomeNodeDef,
): Promise<string> {
	const id = randomUUID();
	await transaction.insert(nodes).values({
		id,
		userId,
		parentId,
		order,
		content: def.content,
		searchText: nodeSearchText(def.content),
		type: nodeType(def),
		metadata: def.type === "task" ? { completed: false } : null,
		dueDate: def.dueDate ?? null,
	});

	if (def.tags && def.tags.length > 0) {
		const tagIds = (
			await transaction
				.insert(tags)
				.values(def.tags.map((name) => ({ userId, name })))
				.onConflictDoUpdate({
					target: [tags.userId, tags.name],
					set: { name: sql`excluded.name` },
				})
				.returning({ id: tags.id })
		).map((row) => row.id);
		await transaction
			.insert(nodeTags)
			.values(tagIds.map((tagId) => ({ nodeId: id, tagId })));
	}

	return id;
}

/** Builds a brand-new sample outline (root + every anchored child + the
 * trailing "delete me" hint) and returns the ids the tour needs. */
export async function buildOnboardingTree(
	transaction: NodeTransaction,
	userId: string,
): Promise<Required<OnboardingSampleNodeIds>> {
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

	const childOrders = generateNKeysBetween(
		null,
		null,
		onboardingAnchoredNodeKeys.length + 1,
	);

	const sampleNodeIds = { root: rootId } as Required<OnboardingSampleNodeIds>;
	for (const [index, key] of onboardingAnchoredNodeKeys.entries()) {
		sampleNodeIds[key] = await insertOnboardingChild(
			transaction,
			userId,
			rootId,
			// biome-ignore lint/style/noNonNullAssertion: index is in-bounds by construction
			childOrders[index]!,
			anchoredChildDefs[key],
		);
	}
	await insertOnboardingChild(
		transaction,
		userId,
		rootId,
		// biome-ignore lint/style/noNonNullAssertion: last of exactly childOrders.length orders generated above
		childOrders[onboardingAnchoredNodeKeys.length]!,
		deleteHintDef,
	);

	return sampleNodeIds;
}

/**
 * Seeds a small, hand-authored starter tree for a brand-new user and marks
 * the onboarding tour as not yet completed. Called once from the sign-up
 * database hook (see `packages/auth`'s `onUserCreated`), never for existing
 * users, so it never runs twice for the same account.
 */
export async function seedOnboardingContent(userId: string): Promise<void> {
	await db.transaction(async (transaction) => {
		const sampleNodeIds = await buildOnboardingTree(transaction, userId);
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
