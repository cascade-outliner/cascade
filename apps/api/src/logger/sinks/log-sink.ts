import type { LogEntry } from "../types/log-entry";

export interface LogSink {
	write(entry: LogEntry): void;
}
