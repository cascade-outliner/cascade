import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
	options: {
		out: { type: "string" },
	},
});

// Workspaces with an instrumented `vitest run --coverage` script (see root
// package.json's `test:coverage:*` scripts) — their coverage-summary.json
// lives at `<dir>/coverage/coverage-summary.json` after that script runs.
const INSTRUMENTED_PACKAGES = [
	{ label: "apps/web-app", dir: "apps/web-app" },
	{ label: "apps/website", dir: "apps/website" },
	{ label: "packages/outliner", dir: "packages/outliner" },
	{ label: "packages/ui", dir: "packages/ui" },
	{ label: "packages/http", dir: "packages/http" },
];

// No `test` script and no tests today — listed explicitly so the table
// surfaces the gap instead of silently omitting these packages.
const UNTESTED_PACKAGES = ["packages/auth", "packages/theme"];

async function readCoverageSummary(dir) {
	try {
		const raw = await readFile(path.join(dir, "coverage", "coverage-summary.json"), "utf-8");
		return JSON.parse(raw).total;
	} catch {
		return null;
	}
}

function pct(value) {
	return value === undefined ? "—" : `${value.toFixed(1)}%`;
}

function row(label, total) {
	if (!total) {
		return `| ${label} | _coverage results missing_ | | | |`;
	}
	return `| ${label} | ${pct(total.lines?.pct)} | ${pct(total.statements?.pct)} | ${pct(total.branches?.pct)} | ${pct(total.functions?.pct)} |`;
}

async function main() {
	const lines = [];
	lines.push("<!-- coverage-report -->");
	lines.push("### Code coverage");
	lines.push("");
	lines.push("| Package | Lines | Statements | Branches | Functions |");
	lines.push("| --- | --- | --- | --- | --- |");

	for (const { label, dir } of INSTRUMENTED_PACKAGES) {
		const total = await readCoverageSummary(dir);
		lines.push(row(label, total));
	}

	for (const label of UNTESTED_PACKAGES) {
		lines.push(`| ${label} | _no tests configured_ | | | |`);
	}

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
