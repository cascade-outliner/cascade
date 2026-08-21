CREATE TABLE "mcp_oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_name" text,
	"redirect_uris" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_code" (
	"code" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_token" (
	"access_token" text PRIMARY KEY NOT NULL,
	"refresh_token" text NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_oauth_token_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
ALTER TABLE "mcp_oauth_code" ADD CONSTRAINT "mcp_oauth_code_client_id_mcp_oauth_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."mcp_oauth_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_oauth_code" ADD CONSTRAINT "mcp_oauth_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_oauth_token" ADD CONSTRAINT "mcp_oauth_token_client_id_mcp_oauth_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."mcp_oauth_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_oauth_token" ADD CONSTRAINT "mcp_oauth_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_oauth_code_client_id_idx" ON "mcp_oauth_code" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "mcp_oauth_token_user_id_idx" ON "mcp_oauth_token" USING btree ("user_id");