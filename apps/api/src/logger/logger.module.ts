import { Global, Module } from "@nestjs/common";
import { AppLogger } from "./app-logger.service";
import { LOG_SINKS } from "./logger.constants";
import { ConsoleLogSink } from "./sinks/console-log.sink";

/**
 * Provides AppLogger app-wide. LOG_SINKS is the extension point: to also
 * ship logs to an external service, add another LogSink provider to this
 * array (e.g. `useFactory: (sentry: SentryLogSink, console: ConsoleLogSink) => [console, sentry]`)
 * — AppLogger and every call site stay unchanged.
 */
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
