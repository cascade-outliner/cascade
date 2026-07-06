import { and, desc, eq, lt, sql } from "drizzle-orm";
import postgres from "postgres";
import { z } from "zod";
import { nodeColumns } from "@/core/nodes/node.queries";
import { nodes } from "@/core/nodes/node.schema";
import { tagColumns } from "@/core/tags/tag.queries";
import { nodeTags, tags } from "@/core/tags/tag.schema";
import { db } from "@/db";
import { base } from "@/orpc/context";

// Postgres unique-violation code (23505) is used to enforce case-insensitive,
// per-parent tag-name uniqueness at the DB layer; procedures below catch it
// and translate it into the domain-level DUPLICATE_NAME error.
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
	return err instanceof postgres.PostgresError && err.code === UNIQUE_VIOLATION;
}

const hexColor = z
	.string()
	.regex(/^#[0-9a-f]{6}$/i, "Color must be a hex string like #6b7280");

export const createTag = base
	.errors({
		NOT_FOUND: { status: 404, message: "Parent tag not found" },
		DUPLICATE_NAME: {
			status: 409,
			message: "A tag with this name already exists at this level",
		},
	})
	.input(
		z.object({
			name: z.string().trim().min(1).max(100),
			parentId: z.string().nullable(),
			color: hexColor.default("#6b7280"),
		}),
	)
	.handler(async ({ input, errors }) => {
		if (input.parentId) {
			const [parent] = await db
				.select({ id: tags.id })
				.from(tags)
				.where(eq(tags.id, input.parentId))
				.limit(1);
			if (!parent) throw errors.NOT_FOUND();
		}
		try {
			const [created] = await db
				.insert(tags)
				.values(input)
				.returning(tagColumns);
			return created;
		} catch (err) {
			if (isUniqueViolation(err)) throw errors.DUPLICATE_NAME();
			throw err;
		}
	});

export const renameTag = base
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
		DUPLICATE_NAME: {
			status: 409,
			message: "A tag with this name already exists at this level",
		},
	})
	.input(z.object({ id: z.string(), name: z.string().trim().min(1).max(100) }))
	.handler(async ({ input, errors }) => {
		try {
			const [updated] = await db
				.update(tags)
				.set({ name: input.name })
				.where(eq(tags.id, input.id))
				.returning(tagColumns);
			if (!updated) throw errors.NOT_FOUND();
			return updated;
		} catch (err) {
			if (isUniqueViolation(err)) throw errors.DUPLICATE_NAME();
			throw err;
		}
	});

export const setTagColor = base
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
	})
	.input(z.object({ id: z.string(), color: hexColor }))
	.handler(async ({ input, errors }) => {
		const [updated] = await db
			.update(tags)
			.set({ color: input.color })
			.where(eq(tags.id, input.id))
			.returning(tagColumns);
		if (!updated) throw errors.NOT_FOUND();
		return updated;
	});

export const moveTag = base
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
		INVALID_MOVE: {
			status: 422,
			message: "Cannot move a tag into its own subtree",
		},
		DUPLICATE_NAME: {
			status: 409,
			message: "A tag with this name already exists at this level",
		},
	})
	.input(z.object({ id: z.string(), parentId: z.string().nullable() }))
	.handler(async ({ input, errors }) => {
		await db.transaction(async (tx) => {
			const [moved] = await tx
				.select({ id: tags.id })
				.from(tags)
				.where(eq(tags.id, input.id))
				.for("update");
			if (!moved) throw errors.NOT_FOUND();

			if (input.parentId) {
				if (input.parentId === input.id) throw errors.INVALID_MOVE();
				const cycle = await tx.execute(sql`
					WITH RECURSIVE ancestors AS (
						SELECT id, parent_id FROM tags WHERE id = ${input.parentId}
						UNION ALL
						SELECT t.id, t.parent_id FROM tags t JOIN ancestors a ON t.id = a.parent_id
					)
					SELECT 1 FROM ancestors WHERE id = ${input.id} LIMIT 1
				`);
				if (cycle.length > 0) throw errors.INVALID_MOVE();
			}

			try {
				await tx
					.update(tags)
					.set({ parentId: input.parentId })
					.where(eq(tags.id, input.id));
			} catch (err) {
				if (isUniqueViolation(err)) throw errors.DUPLICATE_NAME();
				throw err;
			}
		});
	});

export const deleteTag = base
	.input(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const [{ count }] = (await db.execute(sql`
			WITH RECURSIVE descendants AS (
				SELECT id FROM tags WHERE parent_id = ${input.id}
				UNION ALL
				SELECT t.id FROM tags t JOIN descendants d ON t.parent_id = d.id
			)
			SELECT count(*)::int AS count FROM descendants
		`)) as unknown as [{ count: number }];

		await db.delete(tags).where(eq(tags.id, input.id));

		return { childTagsDeleted: count };
	});

export const listTags = base
	.input(z.object({ q: z.string().trim().optional() }).default({}))
	.handler(async ({ input }) => {
		return db
			.select(tagColumns)
			.from(tags)
			.where(input.q ? sql`${tags.name} ILIKE ${`%${input.q}%`}` : undefined)
			.orderBy(sql`lower(${tags.name})`);
	});

export const getTagsForNode = base
	.input(z.object({ nodeId: z.string() }))
	.handler(async ({ input }) => {
		return db
			.select(tagColumns)
			.from(nodeTags)
			.innerJoin(tags, eq(nodeTags.tagId, tags.id))
			.where(eq(nodeTags.nodeId, input.nodeId))
			.orderBy(sql`lower(${tags.name})`);
	});

export const getNodesForTag = base
	.input(
		z.object({
			tagId: z.string(),
			cursor: z.string().nullable().default(null),
			limit: z.number().int().min(1).max(500).default(100),
		}),
	)
	.handler(async ({ input }) => {
		const rows = await db
			.select({ ...nodeColumns, attachedAt: nodeTags.createdAt })
			.from(nodeTags)
			.innerJoin(nodes, eq(nodeTags.nodeId, nodes.id))
			.where(
				and(
					eq(nodeTags.tagId, input.tagId),
					input.cursor
						? lt(nodeTags.createdAt, new Date(input.cursor))
						: undefined,
				),
			)
			.orderBy(desc(nodeTags.createdAt))
			.limit(input.limit + 1);

		const page = rows.slice(0, input.limit);
		return {
			rows: page.map(({ attachedAt, ...node }) => node),
			nextCursor:
				rows.length > input.limit
					? (page[page.length - 1]?.attachedAt.toISOString() ?? null)
					: null,
		};
	});

export const attachTag = base
	.errors({
		NOT_FOUND: { status: 404, message: "Node or tag not found" },
	})
	.input(z.object({ nodeId: z.string(), tagId: z.string() }))
	.handler(async ({ input, errors }) => {
		const [[node], [tag]] = await Promise.all([
			db
				.select({ id: nodes.id })
				.from(nodes)
				.where(eq(nodes.id, input.nodeId))
				.limit(1),
			db
				.select({ id: tags.id })
				.from(tags)
				.where(eq(tags.id, input.tagId))
				.limit(1),
		]);
		if (!node || !tag) throw errors.NOT_FOUND();

		await db.insert(nodeTags).values(input).onConflictDoNothing();
	});

export const detachTag = base
	.input(z.object({ nodeId: z.string(), tagId: z.string() }))
	.handler(async ({ input }) => {
		const result = await db
			.delete(nodeTags)
			.where(
				and(eq(nodeTags.nodeId, input.nodeId), eq(nodeTags.tagId, input.tagId)),
			)
			.returning({ nodeId: nodeTags.nodeId });
		return { removed: result.length > 0 };
	});
