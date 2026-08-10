import { Module } from "@nestjs/common";
import { DRIZZLE, drizzleProvider } from "./providers/drizzle.provider";
import { DrizzleHealthIndicator } from "./providers/drizzle-health.indicator";

@Module({
	providers: [drizzleProvider, DrizzleHealthIndicator],
	exports: [DRIZZLE, DrizzleHealthIndicator],
})
export class DatabaseModule {}
