CREATE TABLE "node_tags" (
	"node_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "node_tags_node_id_tag_id_pk" PRIMARY KEY("node_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_tags" ADD CONSTRAINT "node_tags_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_tags" ADD CONSTRAINT "node_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_tags_tag_id_idx" ON "node_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "tags_parent_id_idx" ON "tags" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_parent_id_name_lower_idx" ON "tags" USING btree ("parent_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_root_name_lower_idx" ON "tags" USING btree (lower("name")) WHERE "tags"."parent_id" IS NULL;