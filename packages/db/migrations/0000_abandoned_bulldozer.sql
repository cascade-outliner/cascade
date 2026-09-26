CREATE TABLE "nodes" (
	"workspace_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"order" text NOT NULL,
	"content" jsonb NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"task" jsonb,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nodes_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nodes_workspace_synced_idx" ON "nodes" USING btree ("workspace_id","synced_at");