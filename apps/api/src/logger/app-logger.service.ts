import {
	Inject,
	Injectable,
	type LoggerService,
	type LogLevel,
} from "@nestjs/common";
import { LOG_SINKS } from "./logger.constants";
import type { LogSink } from "./sinks/log-sink";
import type { LogEntry } from "./types/log-entry";

const STACK_TRACE_PATTERN = /^(.)+\n\s+at .+:\d+:\d+/;

function isStackTrace(value: unknown): value is string {
	return typeof value === "string" && STACK_TRACE_PATTERN.test(value);
}

function stringifyMessage(message: unknown): string {
	return typeof message === "string" ? message : JSON.stringify(message);
}

/**
 * Generic application logger. Implements Nest's LoggerService so it can be
 * passed to `app.useLogger()` and injected anywhere `@nestjs/common`'s
 * Logger normally would be, but every entry is fanned out to the LogSink[]
 * provided by LoggerModule instead of writing to stdout/stderr directly.
 *
 * To ship logs to an external service, add a LogSink implementation (e.g.
 * a SentryLogSink or DatadogLogSink) to LOG_SINKS in LoggerModule — nothing
 * here or at any call site needs to change.
 */
@Injectable()
export class AppLogger implements LoggerService {
	constructor(@Inject(LOG_SINKS) private readonly sinks: LogSink[]) {}

	log(message: unknown, ...optionalParams: unknown[]): void {
		const { context } = extractContext(optionalParams);
		this.dispatch("log", message, context);
	}

	warn(message: unknown, ...optionalParams: unknown[]): void {
		const { context } = extractContext(optionalParams);
		this.dispatch("warn", message, context);
	}

	debug(message: unknown, ...optionalParams: unknown[]): void {
		const { context } = extractContext(optionalParams);
		this.dispatch("debug", message, context);
	}

	verbose(message: unknown, ...optionalParams: unknown[]): void {
		const { context } = extractContext(optionalParams);
		this.dispatch("verbose", message, context);
	}

	fatal(message: unknown, ...optionalParams: unknown[]): void {
		const { context } = extractContext(optionalParams);
		this.dispatch("fatal", message, context);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		const { context, trace } = extractContextAndTrace(optionalParams);
		this.dispatch("error", message, context, trace);
	}

	private dispatch(
		level: LogLevel,
		message: unknown,
		context?: string,
		trace?: string,
	): void {
		const entry: LogEntry = {
			level,
			message: stringifyMessage(message),
			context,
			trace,
			timestamp: new Date(),
		};

		for (const sink of this.sinks) sink.write(entry);
	}
}

function extractContext(optionalParams: unknown[]): { context?: string } {
	const last = optionalParams.at(-1);
	return { context: typeof last === "string" ? last : undefined };
}

function extractContextAndTrace(optionalParams: unknown[]): {
	context?: string;
	trace?: string;
} {
	if (optionalParams.length === 0) return {};

	if (optionalParams.length === 1) {
		const [only] = optionalParams;
		return isStackTrace(only)
			? { trace: only }
			: { context: typeof only === "string" ? only : undefined };
	}

	const [trace, context] = optionalParams;
	return {
		trace: typeof trace === "string" ? trace : undefined,
		context: typeof context === "string" ? context : undefined,
	};
}
