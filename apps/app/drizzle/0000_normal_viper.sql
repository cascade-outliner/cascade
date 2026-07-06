CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" text,
	"content" jsonb,
	"type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"expanded" boolean DEFAULT false NOT NULL,
	"order" text NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(search_text, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nodes_parent_id_idx" ON "nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "nodes_parent_order_idx" ON "nodes" USING btree ("parent_id","order");--> statement-breakpoint
CREATE INDEX "nodes_search_vector_idx" ON "nodes" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "nodes_search_text_trgm_idx" ON "nodes" USING gin ("search_text" gin_trgm_ops);