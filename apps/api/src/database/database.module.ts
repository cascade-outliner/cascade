import { Module } from "@nestjs/common";
import { DRIZZLE, drizzleProvider } from "./providers/drizzle.provider";
import { DrizzleHealthIndicator } from "./providers/drizzle-health.indicator";
import {TerminusModule} from "@nestjs/terminus";

@Module({
	imports: [TerminusModule],
	providers: [drizzleProvider, DrizzleHealthIndicator],
	exports: [DRIZZLE, DrizzleHealthIndicator],
})
export class DatabaseModule {}
