ALTER TABLE "nodes" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "nodes_search_text_trgm_idx" ON "nodes" USING gin ("search_text" gin_trgm_ops);