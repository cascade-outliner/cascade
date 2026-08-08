import {
	nextStatusColor,
	type StatusSummary,
} from "@cascade/outliner/node-statuses";
import { and, count, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { createStatusInputSchema } from "@/features/nodes/model/status.schema";
import { statuses } from "@/features/nodes/server/persistence/node-tables";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import { authed } from "@/orpc/context";

/** Creates a status, appended to the end of the user's list and colored from
 * the shared palette so the picker never asks for one up front. */
export const createStatus = authed
	.errors({
		CONFLICT: {
			status: 409,
			message: "A status with this name already exists",
		},
	})
	.input(createStatusInputSchema)
	.handler(async ({ input, context, errors }): Promise<StatusSummary> => {
		await assertNodeCapabilityEnabled(context.user.id, "status");
		const userId = context.user.id;

		return db.transaction(async (transaction) => {
			const [existing] = await transaction
				.select({ id: statuses.id })
				.from(statuses)
				.where(
					and(
						eq(statuses.userId, userId),
						eq(statuses.boardId, input.boardId),
						sql`lower(${statuses.name}) = lower(${input.name})`,
					),
				)
				.limit(1);
			if (existing) throw errors.CONFLICT();

			const [totals] = await transaction
				.select({ total: count(), highest: max(statuses.sortOrder) })
				.from(statuses)
				.where(
					and(eq(statuses.userId, userId), eq(statuses.boardId, input.boardId)),
				);

			const [created] = await transaction
				.insert(statuses)
				.values({
					userId,
					boardId: input.boardId,
					name: input.name,
					color: input.color ?? nextStatusColor(totals?.total ?? 0),
					sortOrder: (totals?.highest ?? -1) + 1,
				})
				.returning({
					id: statuses.id,
					name: statuses.name,
					color: statuses.color,
				});
			return created;
		});
	});
