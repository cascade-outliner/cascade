import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en');
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "illustration" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes_preview_entries" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "preview_date_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans_features" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "price" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "pages_blocks_pricing" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "pages_blocks_faq" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "illustration" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "description" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes_preview_entries" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "body" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "preview_date_label" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans_features" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "price" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "cta_label" DROP NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "cta_url" DROP NOT NULL;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_title" DROP NOT NULL;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_slug" DROP NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "no_index" boolean DEFAULT false;
  ALTER TABLE "pages" ADD COLUMN "_status" "enum_pages_status" DEFAULT 'draft';
  ALTER TABLE "_pages_v" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_no_index" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version__status" "enum__pages_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_pages_v" ADD COLUMN "published_locale" "enum__pages_v_published_locale";
  ALTER TABLE "_pages_v" ADD COLUMN "latest" boolean;
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");`)

  // Everything that existed before drafts was live; keep it that way.
  await db.execute(sql`
   UPDATE "pages" SET "_status" = 'published';
  UPDATE "_pages_v" SET "version__status" = 'published', "published_locale" = 'en';
  UPDATE "_pages_v" v SET "latest" = true WHERE v."id" = (SELECT max("id") FROM "_pages_v" WHERE "parent_id" = v."parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "pages__status_idx";
  DROP INDEX "_pages_v_version_version__status_idx";
  DROP INDEX "_pages_v_published_locale_idx";
  DROP INDEX "_pages_v_latest_idx";
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_hero" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "illustration" SET NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid_features" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "pages_blocks_feature_grid" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes_preview_entries" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "pages_blocks_daily_notes" ALTER COLUMN "preview_date_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans_features" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "price" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing_plans" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "pages_blocks_pricing" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "question" SET NOT NULL;
  ALTER TABLE "pages_blocks_faq_items" ALTER COLUMN "answer" SET NOT NULL;
  ALTER TABLE "pages_blocks_faq" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_cta" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "pages" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_hero" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "illustration" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ALTER COLUMN "description" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_feature_grid" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes_preview_entries" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "body" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_daily_notes" ALTER COLUMN "preview_date_label" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans_features" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "price" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing_plans" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_pricing" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq_items" ALTER COLUMN "question" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq_items" ALTER COLUMN "answer" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_faq" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "cta_label" SET NOT NULL;
  ALTER TABLE "_pages_v_blocks_cta" ALTER COLUMN "cta_url" SET NOT NULL;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_title" SET NOT NULL;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_slug" SET NOT NULL;
  ALTER TABLE "pages" DROP COLUMN "meta_title";
  ALTER TABLE "pages" DROP COLUMN "no_index";
  ALTER TABLE "pages" DROP COLUMN "_status";
  ALTER TABLE "_pages_v" DROP COLUMN "version_meta_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_no_index";
  ALTER TABLE "_pages_v" DROP COLUMN "version__status";
  ALTER TABLE "_pages_v" DROP COLUMN "published_locale";
  ALTER TABLE "_pages_v" DROP COLUMN "latest";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";`)
}
