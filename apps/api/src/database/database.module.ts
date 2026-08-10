import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { DRIZZLE, drizzleProvider } from "./drizzle.provider";
import { DrizzleHealthIndicator } from "./drizzle-health.indicator";

@Module({
	imports: [TerminusModule],
	providers: [drizzleProvider, DrizzleHealthIndicator],
	exports: [DRIZZLE, DrizzleHealthIndicator],
})
export class DatabaseModule {}
