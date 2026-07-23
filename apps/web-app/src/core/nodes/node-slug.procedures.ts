import { and, asc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { nodes } from "@/core/nodes/node.schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
} from "@/ui/nodes/node-slug";

export const resolveNodeSlug = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		SLUG_AMBIGUOUS: { status: 409, message: "Ambiguous node slug" },
	})
	.input(z.object({ slugId: z.string(), slugText: z.string().nullable() }))
	.handler(async ({ input, context, errors }) => {
		if (isUuid(input.slugId)) {
			const [node] = await db
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(eq(nodes.id, input.slugId), eq(nodes.userId, context.user.id)),
				)
				.limit(1);
			if (!node) throw errors.NOT_FOUND();
			return node;
		}

		if (isUuidFirstBlock(input.slugId)) {
			const candidates = await db
				.select({ id: nodes.id, content: nodes.content })
				.from(nodes)
				.where(
					and(
						eq(nodes.userId, context.user.id),
						like(nodes.id, `${input.slugId}-%`),
					),
				)
				.orderBy(asc(nodes.createdAt))
				.limit(20);

			if (candidates.length === 0) throw errors.NOT_FOUND();
			if (candidates.length === 1) return { id: candidates[0].id };

			const slugText = input.slugText?.trim();
			if (!slugText) throw errors.SLUG_AMBIGUOUS();

			const matches = candidates.filter(
				(candidate) => slugifyNodeContent(candidate.content) === slugText,
			);

			if (matches.length === 1) return { id: matches[0].id };
			if (matches.length === 0) throw errors.NOT_FOUND();
			throw errors.SLUG_AMBIGUOUS();
		}

		const [node] = await db
			.select({ id: nodes.id })
			.from(nodes)
			.where(and(eq(nodes.id, input.slugId), eq(nodes.userId, context.user.id)))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});
