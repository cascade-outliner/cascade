import type { StatusSummary } from "@cascade/outliner/node-statuses";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { updateStatusInputSchema } from "@/features/nodes/model/status.schema";
import { authed } from "@/orpc/context";
import { statuses } from "../persistence/node-tables";

/** Renames and/or recolors a status from the settings panel. Nodes point at
 * the status by id, so neither edit touches them. */
export const updateStatus = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Status not found" },
		CONFLICT: {
			status: 409,
			message: "A status with this name already exists",
		},
	})
	.input(updateStatusInputSchema)
	.handler(async ({ input, context, errors }): Promise<StatusSummary> => {
		const userId = context.user.id;

		return db.transaction(async (transaction) => {
			const [status] = await transaction
				.select({
					id: statuses.id,
					name: statuses.name,
					color: statuses.color,
				})
				.from(statuses)
				.where(and(eq(statuses.id, input.id), eq(statuses.userId, userId)))
				.for("update");
			if (!status) throw errors.NOT_FOUND();

			if (input.name !== undefined && input.name !== status.name) {
				const [conflict] = await transaction
					.select({ id: statuses.id })
					.from(statuses)
					.where(
						and(
							eq(statuses.userId, userId),
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
				})
				.where(eq(statuses.id, status.id))
				.returning({
					id: statuses.id,
					name: statuses.name,
					color: statuses.color,
				});
			return updated;
		});
	});
