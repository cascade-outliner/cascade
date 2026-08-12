import { Injectable } from "@nestjs/common";
import type { LogEntry } from "../types/log-entry";
import type { LogSink } from "./log-sink";

const CONSOLE_METHOD_BY_LEVEL = {
	verbose: "debug",
	debug: "debug",
	log: "log",
	warn: "warn",
	error: "error",
	fatal: "error",
} as const satisfies Record<
	LogEntry["level"],
	"log" | "warn" | "error" | "debug"
>;

@Injectable()
export class ConsoleLogSink implements LogSink {
	write(entry: LogEntry): void {
		const method = CONSOLE_METHOD_BY_LEVEL[entry.level];
		const context = entry.context ? `[${entry.context}] ` : "";

		console[method](
			`${entry.timestamp.toISOString()} ${entry.level.toUpperCase()} ${context}${entry.message}`,
		);

		if (entry.trace) {
			console.error(entry.trace);
		}
	}
}
