import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { updateStatusInputSchema } from "@/features/nodes/model/status.schema";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import { authed } from "@/orpc/context";
import { statuses } from "../persistence/node-tables";

/** Renames, recolors, and/or hides a status from the settings panel. Nodes
 * point at the status by id, so none of these edits touch them. */
export const updateStatus = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Status not found" },
		CONFLICT: {
			status: 409,
			message: "A status with this name already exists",
		},
	})
	.input(updateStatusInputSchema)
	.handler(
		async ({
			input,
			context,
			errors,
		}): Promise<Omit<StatusWithUsage, "count">> => {
			await assertNodeCapabilityEnabled(context.user.id, "status");
			const userId = context.user.id;

			return db.transaction(async (transaction) => {
				const [status] = await transaction
					.select({
						id: statuses.id,
						name: statuses.name,
						color: statuses.color,
						hidden: statuses.hidden,
					})
					.from(statuses)
					.where(
						and(
							eq(statuses.id, input.id),
							eq(statuses.userId, userId),
							eq(statuses.boardId, input.boardId),
						),
					)
					.for("update");
				if (!status) throw errors.NOT_FOUND();

				if (input.name !== undefined && input.name !== status.name) {
					const [conflict] = await transaction
						.select({ id: statuses.id })
						.from(statuses)
						.where(
							and(
								eq(statuses.userId, userId),
								eq(statuses.boardId, input.boardId),
								ne(statuses.id, status.id),
								sql`lower(${statuses.name}) = lower(${input.name})`,
							),
						)
						.limit(1);
					if (conflict) throw errors.CONFLICT();
				}

				const [updated] = await transaction
					.update(statuses)
					.set({
						name: input.name ?? status.name,
						color: input.color ?? status.color,
						hidden: input.hidden ?? status.hidden,
					})
					.where(eq(statuses.id, status.id))
					.returning({
						id: statuses.id,
						name: statuses.name,
						color: statuses.color,
						hidden: statuses.hidden,
					});
				return updated;
			});
		},
	);
