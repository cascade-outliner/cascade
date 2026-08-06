CREATE TABLE "statuses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'sky' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "status_id" text;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "statuses_user_id_name_idx" ON "statuses" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nodes_user_priority_idx" ON "nodes" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "nodes_status_id_idx" ON "nodes" USING btree ("status_id");