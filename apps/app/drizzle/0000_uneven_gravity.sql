CREATE TABLE "nodes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" text,
	"content" jsonb,
	"type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb,
	"expanded" boolean DEFAULT false NOT NULL,
	"order" text COLLATE "C" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nodes_parent_id_idx" ON "nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "nodes_parent_order_idx" ON "nodes" USING btree ("parent_id","order");