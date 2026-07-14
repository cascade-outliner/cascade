ALTER TABLE "nodes" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "nodes_user_due_date_idx" ON "nodes" USING btree ("user_id","due_date");