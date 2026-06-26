CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"position" real NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;