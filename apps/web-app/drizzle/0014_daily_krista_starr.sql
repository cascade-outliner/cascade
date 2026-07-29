CREATE TABLE "tree_shares" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"token" text NOT NULL,
	"require_login" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tree_shares" ADD CONSTRAINT "tree_shares_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_shares" ADD CONSTRAINT "tree_shares_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tree_shares_token_idx" ON "tree_shares" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tree_shares_node_id_idx" ON "tree_shares" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "tree_shares_owner_id_idx" ON "tree_shares" USING btree ("owner_id");