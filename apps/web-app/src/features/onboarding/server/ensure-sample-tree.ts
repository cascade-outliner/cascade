import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import {
	lockNodeOrdering,
	type NodeTransaction,
	orderAtTarget,
	siblingScope,
} from "@/features/nodes/server/persistence/sibling-order";
import {
	type OnboardingSampleNodeIds,
	onboardingAnchoredNodeKeys,
	type SettingsPatch,
} from "@/features/settings/model/settings.schema";
import { userSettings } from "@/features/settings/server/settings-table";
import {
	anchoredChildDefs,
	buildOnboardingTree,
	insertOnboardingChild,
} from "./seed-onboarding-tree";

async function nodeExists(
	transaction: NodeTransaction,
	userId: string,
	id: string,
): Promise<boolean> {
	const [row] = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
		.limit(1);
	return row !== undefined;
}

/**
 * Called when a user replays the onboarding tour from Settings. Adds back
 * whatever sample-outline nodes the tour needs and no longer exist —
 * because the whole outline was deleted, or just one node was — without
 * ever touching the user's other nodes (real or otherwise). If everything
 * the tour needs is already there, nothing is inserted.
 *
 * Returns the merged settings patch (`onboardingCompleted: false` plus the
 * — possibly updated — sample node ids), matching what `updateSettings`
 * returns, so the caller can write it straight into the settings query
 * cache.
 */
export async function ensureOnboardingSampleTree(
	userId: string,
): Promise<SettingsPatch> {
	return db.transaction(async (transaction) => {
		const [row] = await transaction
			.select({ settings: userSettings.settings })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		const currentIds: OnboardingSampleNodeIds =
			row?.settings?.onboardingSampleNodeIds ?? {};

		const rootId = currentIds.root;

		let sampleNodeIds: OnboardingSampleNodeIds;
		if (!rootId || !(await nodeExists(transaction, userId, rootId))) {
			// The root (and, since deleting it cascades, every child under it)
			// is gone — the only way back is a fresh tree.
			await lockNodeOrdering(transaction, userId);
			sampleNodeIds = await buildOnboardingTree(transaction, userId);
		} else {
			sampleNodeIds = { ...currentIds, root: rootId };
			const missingKeys: (typeof onboardingAnchoredNodeKeys)[number][] = [];
			for (const key of onboardingAnchoredNodeKeys) {
				const id = currentIds[key];
				if (!id || !(await nodeExists(transaction, userId, id))) {
					missingKeys.push(key);
				}
			}
			if (missingKeys.length > 0) {
				await lockNodeOrdering(transaction, userId);
				for (const key of missingKeys) {
					// biome-ignore lint/style/noNonNullAssertion: append always returns an order
					const order = (await orderAtTarget(
						transaction,
						siblingScope(userId, rootId),
						{ position: "append" },
					))!;
					sampleNodeIds[key] = await insertOnboardingChild(
						transaction,
						userId,
						rootId,
						order,
						anchoredChildDefs[key],
					);
				}
			}
		}

		const patch: SettingsPatch = {
			onboardingCompleted: false,
			onboardingSampleNodeIds: sampleNodeIds,
		};
		const [updated] = await transaction
			.insert(userSettings)
			.values({ userId, settings: patch })
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					settings: sql`${userSettings.settings} || ${JSON.stringify(patch)}::jsonb`,
					updatedAt: new Date(),
				},
			})
			.returning({ settings: userSettings.settings });
		return updated.settings;
	});
}
