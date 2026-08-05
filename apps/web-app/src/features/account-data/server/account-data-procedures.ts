import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
	nodes,
	nodeTags,
	tags,
} from "@/features/nodes/server/persistence/node-tables";
import { premiumSeats } from "@/features/premium/server/premium-table";
import type { SettingsPatch } from "@/features/settings/model/settings.schema";
import { userSettings } from "@/features/settings/server/settings-table";
import {
	treeHistoryEvents,
	treeHistorySnapshots,
} from "@/features/tree-history/server/tree-history-table";
import { authed } from "@/orpc/context";

export interface AccountDataExport {
	exportedAt: string;
	account: {
		id: string;
		name: string;
		email: string;
		createdAt: string;
	};
	settings: SettingsPatch;
	premium: { isPremium: boolean; grantedAt: string | null };
	nodes: (typeof nodes.$inferSelect)[];
	tags: (typeof tags.$inferSelect)[];
	nodeTags: (typeof nodeTags.$inferSelect)[];
	treeHistoryEvents: (typeof treeHistoryEvents.$inferSelect)[];
	treeHistorySnapshots: (typeof treeHistorySnapshots.$inferSelect)[];
}

/**
 * A full JSON dump of everything this user owns — nodes (which carry due
 * dates directly), tags, tree history, settings, and premium status. Scoped
 * entirely to `context.user.id`, same as every other account/node procedure.
 */
export const exportAccountData = authed.handler(
	async ({ context }): Promise<AccountDataExport> => {
		const userId = context.user.id;

		const [
			userNodes,
			userTags,
			userTreeHistoryEvents,
			[settingsRow],
			[premiumRow],
		] = await Promise.all([
			db.select().from(nodes).where(eq(nodes.userId, userId)),
			db.select().from(tags).where(eq(tags.userId, userId)),
			db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.userId, userId)),
			db
				.select()
				.from(userSettings)
				.where(eq(userSettings.userId, userId))
				.limit(1),
			db
				.select()
				.from(premiumSeats)
				.where(eq(premiumSeats.userId, userId))
				.limit(1),
		]);

		const nodeIds = userNodes.map((node) => node.id);
		const eventIds = userTreeHistoryEvents.map((event) => event.id);

		const [userNodeTags, userTreeHistorySnapshots] = await Promise.all([
			nodeIds.length
				? db.select().from(nodeTags).where(inArray(nodeTags.nodeId, nodeIds))
				: Promise.resolve([]),
			eventIds.length
				? db
						.select()
						.from(treeHistorySnapshots)
						.where(inArray(treeHistorySnapshots.eventId, eventIds))
				: Promise.resolve([]),
		]);

		return {
			exportedAt: new Date().toISOString(),
			account: {
				id: context.user.id,
				name: context.user.name,
				email: context.user.email,
				createdAt: context.user.createdAt.toISOString(),
			},
			settings: settingsRow?.settings ?? {},
			premium: {
				isPremium: !!premiumRow,
				grantedAt: premiumRow?.grantedAt.toISOString() ?? null,
			},
			nodes: userNodes,
			tags: userTags,
			nodeTags: userNodeTags,
			treeHistoryEvents: userTreeHistoryEvents,
			treeHistorySnapshots: userTreeHistorySnapshots,
		};
	},
);
