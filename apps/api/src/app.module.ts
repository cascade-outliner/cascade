import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		DatabaseModule,
		HealthModule,
		// Feature modules land here as they're implemented: AuthModule,
		// UsersModule, NodesModule, TreeHistoryModule, MaintenanceModule.
		// See src/modules/*/README.md and ARCHITECTURE.md for the planned
		// shape of each.
	],
})
export class AppModule {}
