CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent";--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
WITH "node_plain_text" AS (
	SELECT
		"nodes"."id",
		string_agg("text_node"."value" #>> '{}', ' ' ORDER BY "text_node"."ordinality") AS "value"
	FROM "nodes"
	CROSS JOIN LATERAL jsonb_path_query(
		"nodes"."content",
		'strict $.** ? (@.type == "text").text'
	) WITH ORDINALITY AS "text_node"("value", "ordinality")
	GROUP BY "nodes"."id"
)
UPDATE "nodes"
SET "search_text" = trim(
	regexp_replace(
		lower(unaccent("node_plain_text"."value")),
		'\s+',
		' ',
		'g'
	)
)
FROM "node_plain_text"
WHERE "nodes"."id" = "node_plain_text"."id";--> statement-breakpoint
CREATE INDEX "nodes_search_text_trgm_idx" ON "nodes" USING gin ("search_text" gin_trgm_ops);