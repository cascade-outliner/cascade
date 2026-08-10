import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SessionGuard } from "./modules/auth/guards/session.guard";
import { HealthModule } from "./modules/health/health.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { NodesModule } from "./modules/nodes/nodes.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		DatabaseModule,
		AuthModule,
		HealthModule,
		MaintenanceModule,
		NodesModule,
		// Remaining feature modules land here as they're implemented:
		// UsersModule, TreeHistoryModule.
		// See src/modules/*/README.md and ARCHITECTURE.md for the planned
		// shape of each.
	],
	providers: [
		// Wired app-wide here (#685) now that #684's SessionGuard exists on
		// this branch — see #684's note about whichever PR lands second
		// doing this. modules/health's controller stays reachable via its
		// @Public() decorator.
		{ provide: APP_GUARD, useClass: SessionGuard },
	],
})
export class AppModule {}
