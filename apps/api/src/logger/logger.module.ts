import { Global, Module } from "@nestjs/common";
import { AppLogger } from "./app-logger.service";
import { LOG_SINKS } from "./logger.constants";
import { ConsoleLogSink } from "./sinks/console-log.sink";

@Global()
@Module({
	providers: [
		ConsoleLogSink,
		{
			provide: LOG_SINKS,
			useFactory: (consoleSink: ConsoleLogSink) => [consoleSink],
			inject: [ConsoleLogSink],
		},
		AppLogger,
	],
	exports: [AppLogger],
})
export class LoggerModule {}
