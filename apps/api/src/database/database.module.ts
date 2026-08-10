import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { DRIZZLE, drizzleProvider } from "./providers/drizzle.provider";
import { DrizzleHealthIndicator } from "./providers/drizzle-health.indicator";

@Module({
	imports: [TerminusModule],
	providers: [drizzleProvider, DrizzleHealthIndicator],
	exports: [DRIZZLE, DrizzleHealthIndicator, TerminusModule],
})
export class DatabaseModule {}
