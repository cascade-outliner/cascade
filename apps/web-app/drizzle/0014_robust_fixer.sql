CREATE TABLE "node_deletion_receipt_snapshots" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" text NOT NULL,
	"node_id" text NOT NULL,
	"parent_id" text,
	"content" jsonb,
	"type" text NOT NULL,
	"metadata" jsonb,
	"expanded" boolean NOT NULL,
	"order" text NOT NULL,
	"due_date" date,
	"recurrence" jsonb,
	"tags" jsonb NOT NULL,
	"depth" integer NOT NULL,
	"is_root" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_deletion_receipts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"root_node_id" text NOT NULL,
	"parent_id" text,
	"target" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "node_deletion_receipt_snapshots" ADD CONSTRAINT "node_deletion_receipt_snapshots_receipt_id_node_deletion_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."node_deletion_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_deletion_receipts" ADD CONSTRAINT "node_deletion_receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_deletion_receipt_snapshots_receipt_idx" ON "node_deletion_receipt_snapshots" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "node_deletion_receipts_user_id_idx" ON "node_deletion_receipts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "node_deletion_receipts_expires_at_idx" ON "node_deletion_receipts" USING btree ("expires_at");