import { Module } from "@nestjs/common";
import { DRIZZLE, drizzleProvider } from "./drizzle.provider";

@Module({
	providers: [drizzleProvider],
	exports: [DRIZZLE],
})
export class DatabaseModule {}
