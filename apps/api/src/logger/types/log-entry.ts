import type { LogLevel } from "@nestjs/common";

export interface LogEntry {
	level: LogLevel;
	message: string;
	context?: string;
	trace?: string;
	timestamp: Date;
}
