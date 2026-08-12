import type { LogEntry } from "../types/log-entry";

/**
 * A destination for log entries. AppLogger fans every entry out to every
 * registered sink, so adding an external service (Sentry, Datadog, etc.)
 * later is just another LogSink registered alongside ConsoleLogSink in
 * LoggerModule — nothing else in the app needs to change.
 */
export interface LogSink {
	write(entry: LogEntry): void;
}
