import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		DatabaseModule,
		AuthModule,
		HealthModule,
		// SessionGuard isn't wired up as an app-wide APP_GUARD provider yet —
		// left for whichever of #684/the validation issue lands second, so
		// two PRs don't race to add the same provider. See #684.
		//
		// Remaining feature modules land here as they're implemented:
		// UsersModule, NodesModule, TreeHistoryModule, MaintenanceModule.
		// See src/modules/*/README.md and ARCHITECTURE.md for the planned
		// shape of each.
	],
})
export class AppModule {}
