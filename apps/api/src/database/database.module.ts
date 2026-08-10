import { Module } from "@nestjs/common";
import { DRIZZLE, drizzleProvider } from "./providers/drizzle.provider";

@Module({
	providers: [drizzleProvider],
	exports: [DRIZZLE],
})
export class DatabaseModule {}
