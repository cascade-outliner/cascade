DROP INDEX "statuses_user_id_name_idx";--> statement-breakpoint
ALTER TABLE "statuses" ADD COLUMN "board_id" text;--> statement-breakpoint
ALTER TABLE "statuses" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_board_id_nodes_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "statuses_user_id_board_id_name_idx" ON "statuses" USING btree ("user_id","board_id","name");--> statement-breakpoint
CREATE INDEX "statuses_board_id_idx" ON "statuses" USING btree ("board_id");