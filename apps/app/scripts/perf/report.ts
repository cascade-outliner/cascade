import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { cliArgs } from "./cli-args";
import type { LatencySummary } from "./stats";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		beforeDir: { type: "string", default: "perf-results/before" },
		afterDir: { type: "string", default: "perf-results/after" },
		out: { type: "string" },
	},
});

interface QueryBenchResult {
	visibleTree: LatencySummary;
	getNodeAncestors: LatencySummary;
}

interface MoveBenchResult {
	moveNode: LatencySummary;
	opsPerSec: number;
}

async function readJson<T>(filePath: string): Promise<T | null> {
	try {
		return JSON.parse(await readFile(filePath, "utf-8")) as T;
	} catch {
		return null;
	}
}

function pct(before: number, after: number): string {
	if (before === 0) return "n/a";
	const delta = ((after - before) / before) * 100;
	const sign = delta > 0 ? "+" : "";
	return `${sign}${delta.toFixed(1)}%`;
}

function fmt(value: number | undefined, unit: string): string {
	return value === undefined ? "—" : `${value.toFixed(1)}${unit}`;
}

// Each side (before/after) is rendered independently — a missing "before"
// (e.g. the base branch predates this harness, see perf.yml) shouldn't blank
// out an "after" number that's actually available.
function row(
	label: string,
	before: number | undefined,
	after: number | undefined,
	unit: string,
): string {
	const delta = before !== undefined && after !== undefined ? pct(before, after) : "—";
	return `| ${label} | ${fmt(before, unit)} | ${fmt(after, unit)} | ${delta} |`;
}

async function main() {
	const beforeQuery = await readJson<QueryBenchResult>(
		path.join(values.beforeDir, "query-bench.json"),
	);
	const afterQuery = await readJson<QueryBenchResult>(
		path.join(values.afterDir, "query-bench.json"),
	);
	const beforeMove = await readJson<MoveBenchResult>(
		path.join(values.beforeDir, "move-bench.json"),
	);
	const afterMove = await readJson<MoveBenchResult>(
		path.join(values.afterDir, "move-bench.json"),
	);

	const lines: string[] = [];
	lines.push("<!-- perf-report -->");
	lines.push("### Performance comparison (base branch vs. this PR)");
	lines.push("");
	lines.push("| Metric | Base | This PR | Δ |");
	lines.push("| --- | --- | --- | --- |");

	if (beforeQuery || afterQuery) {
		lines.push(
			row("visibleTree p50", beforeQuery?.visibleTree.p50Ms, afterQuery?.visibleTree.p50Ms, "ms"),
		);
		lines.push(
			row("visibleTree p95", beforeQuery?.visibleTree.p95Ms, afterQuery?.visibleTree.p95Ms, "ms"),
		);
		lines.push(
			row(
				"getNodeAncestors p50",
				beforeQuery?.getNodeAncestors.p50Ms,
				afterQuery?.getNodeAncestors.p50Ms,
				"ms",
			),
		);
		lines.push(
			row(
				"getNodeAncestors p95",
				beforeQuery?.getNodeAncestors.p95Ms,
				afterQuery?.getNodeAncestors.p95Ms,
				"ms",
			),
		);
	} else {
		lines.push("| query-bench results missing | — | — | — |");
	}

	if (beforeMove || afterMove) {
		lines.push(row("moveNode p50", beforeMove?.moveNode.p50Ms, afterMove?.moveNode.p50Ms, "ms"));
		lines.push(row("moveNode p95", beforeMove?.moveNode.p95Ms, afterMove?.moveNode.p95Ms, "ms"));
		lines.push(
			row("moveNode throughput", beforeMove?.opsPerSec, afterMove?.opsPerSec, " ops/s"),
		);
	} else {
		lines.push("| move-bench results missing | — | — | — |");
	}

	if (!beforeQuery || !beforeMove) {
		lines.push("");
		lines.push(
			"_No 'Base' numbers yet — the base branch doesn't have `scripts/perf/` " +
				"(or its run failed). This resolves once the harness lands on the base branch._",
		);
	}

	lines.push("");
	lines.push(
		"_Lower is better for latency rows, higher is better for throughput. Measured against a fixed-size seeded tree " +
			"(see `.github/workflows/perf.yml`) — this is a comparison, not a pass/fail gate. See " +
			"[issue #304](https://github.com/Patrickroelofs/cascade/issues/304)._",
	);

	const markdown = lines.join("\n");
	console.log(markdown);
	if (values.out) {
		await writeFile(values.out, markdown);
		console.log(`\nWrote report to ${values.out}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
