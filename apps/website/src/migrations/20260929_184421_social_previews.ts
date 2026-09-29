import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" ADD COLUMN "site_url" varchar DEFAULT 'https://cascadelist.com' NOT NULL;
  ALTER TABLE "_header_v" ADD COLUMN "version_site_url" varchar DEFAULT 'https://cascadelist.com' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header" DROP COLUMN "site_url";
  ALTER TABLE "_header_v" DROP COLUMN "version_site_url";`)
}
