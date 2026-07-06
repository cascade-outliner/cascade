import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connection = postgres(process.env.DATABASE_URL as string, { max: 1 });
const db = drizzle(connection);

async function runMigrations() {
	console.log("⏳ Running migrations...");

	await migrate(db, { migrationsFolder: "./drizzle" });

	console.log("✅ Migrations complete!");
	process.exit(0);
}

runMigrations().catch((err) => {
	console.error("❌ Migration failed!", err);
	process.exit(1);
});
