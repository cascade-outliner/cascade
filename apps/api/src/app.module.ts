import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { NodesModule } from "./modules/nodes/nodes.module";
import { AuthGuard } from "./auth/guards/auth.guard";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env.local", ".env"],
		}),
		AuthModule,
		DatabaseModule,
		HealthModule,
		NodesModule,
	],
	providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
