import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_feature_grid_features" ADD COLUMN "coming_soon" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_feature_grid_features" ADD COLUMN "coming_soon" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_feature_grid_features" DROP COLUMN "coming_soon";
  ALTER TABLE "_pages_v_blocks_feature_grid_features" DROP COLUMN "coming_soon";`)
}
