import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodeColumns } from "../persistence/node-columns";
import { nodes } from "../persistence/node-tables";

export const listNodes = authed
	.input(z.object({ parentId: z.string().nullable() }))
	.handler(async ({ input, context }) => {
		return db
			.select(nodeColumns(context.user.id))
			.from(nodes)
			.where(
				and(
					eq(nodes.userId, context.user.id),
					input.parentId === null
						? isNull(nodes.parentId)
						: eq(nodes.parentId, input.parentId),
				),
			)
			.orderBy(asc(nodes.order));
	});
