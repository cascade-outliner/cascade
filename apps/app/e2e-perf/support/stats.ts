import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface LatencySample {
	ok: boolean;
	ms: number;
}

function percentile(sortedMs: number[], p: number): number {
	if (sortedMs.length === 0) return 0;
	const idx = Math.min(sortedMs.length - 1, Math.floor(p * sortedMs.length));
	return sortedMs[idx];
}

export interface LatencySummary {
	count: number;
	errors: number;
	meanMs: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	minMs: number;
	maxMs: number;
}

export function summarize(samples: LatencySample[]): LatencySummary {
	const ok = samples
		.filter((s) => s.ok)
		.map((s) => s.ms)
		.sort((a, b) => a - b);
	const sum = ok.reduce((a, b) => a + b, 0);
	return {
		count: samples.length,
		errors: samples.length - ok.length,
		meanMs: ok.length > 0 ? sum / ok.length : 0,
		p50Ms: percentile(ok, 0.5),
		p95Ms: percentile(ok, 0.95),
		p99Ms: percentile(ok, 0.99),
		minMs: ok.length > 0 ? ok[0] : 0,
		maxMs: ok.length > 0 ? ok[ok.length - 1] : 0,
	};
}

export function printSummary(label: string, summary: LatencySummary): void {
	console.log(
		`${label}: n=${summary.count} errors=${summary.errors} ` +
			`mean=${summary.meanMs.toFixed(1)}ms p50=${summary.p50Ms.toFixed(1)}ms ` +
			`p95=${summary.p95Ms.toFixed(1)}ms p99=${summary.p99Ms.toFixed(1)}ms ` +
			`min=${summary.minMs.toFixed(1)}ms max=${summary.maxMs.toFixed(1)}ms`,
	);
}

export type TimedOutcome<T> =
	| { ok: true; ms: number; result: T }
	| { ok: false; ms: number; error: unknown };

/** Times an async call, capturing ok/error so one failure doesn't abort a whole run. */
export async function time<T>(fn: () => Promise<T>): Promise<TimedOutcome<T>> {
	const start = performance.now();
	try {
		const result = await fn();
		return { ok: true, ms: performance.now() - start, result };
	} catch (error) {
		return { ok: false, ms: performance.now() - start, error };
	}
}

/** Writes JSON results under apps/app/perf-results/ (gitignored), returning the path written. */
export async function writeResultsFile(fileName: string, data: unknown): Promise<string> {
	const outPath = path.join(process.cwd(), "perf-results", fileName);
	await mkdir(path.dirname(outPath), { recursive: true });
	await writeFile(outPath, JSON.stringify(data, null, 2));
	return outPath;
}
