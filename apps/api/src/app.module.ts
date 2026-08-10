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
	],
})
export class AppModule {}
