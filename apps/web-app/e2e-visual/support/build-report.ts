import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

/**
 * Builds the markdown PR comment for .github/workflows/visual.yml from the
 * visual suite's `--reporter=json` output (see playwright.visual.config.ts).
 * By default only lists screenshots that actually changed against their
 * checked-in baseline, so a PR that doesn't touch the tree/editor UI gets a
 * short "no visual changes" comment instead of a wall of unrelated
 * passes. Pass --forceFull to list every screenshotted state regardless of
 * pass/fail, which visual.yml uses once to prove end-to-end that the
 * comment pipeline actually posts real screenshot results.
 */
const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		input: { type: "string", default: "visual-results.json" },
		out: { type: "string" },
		forceFull: { type: "boolean", default: false },
	},
});

interface PlaywrightAttachment {
	name: string;
	contentType: string;
	path?: string;
}

interface PlaywrightResult {
	status: "passed" | "failed" | "timedOut" | "interrupted" | "skipped";
	attachments?: PlaywrightAttachment[];
	error?: { message?: string };
}

interface PlaywrightTest {
	projectName: string;
	status: "expected" | "unexpected" | "flaky" | "skipped";
	results: PlaywrightResult[];
}

interface PlaywrightSpec {
	title: string;
	ok: boolean;
	tests: PlaywrightTest[];
}

interface PlaywrightSuite {
	title: string;
	suites?: PlaywrightSuite[];
	specs?: PlaywrightSpec[];
}

interface PlaywrightJsonReport {
	suites: PlaywrightSuite[];
	stats: {
		expected: number;
		unexpected: number;
		skipped: number;
		flaky: number;
	};
}

interface StateResult {
	/** e.g. "theme: light > row hover state (light)" */
	path: string;
	ok: boolean;
	/** Pixel-diff ratio parsed out of the toHaveScreenshot failure message, if any. */
	diffRatio: number | null;
}

const DIFF_RATIO_PATTERN = /ratio ([\d.]+) of all image pixels/;

function collectStates(
	suites: PlaywrightSuite[],
	titlePath: string[],
): StateResult[] {
	const results: StateResult[] = [];
	for (const suite of suites) {
		const nextPath = [...titlePath, suite.title];
		for (const spec of suite.specs ?? []) {
			const lastResult = spec.tests.flatMap((test) => test.results).at(-1);
			const message = lastResult?.error?.message ?? "";
			const diffMatch = message.match(DIFF_RATIO_PATTERN);
			results.push({
				path: [...nextPath, spec.title].join(" > "),
				ok: spec.ok,
				diffRatio: diffMatch?.[1] ? Number(diffMatch[1]) : null,
			});
		}
		results.push(...collectStates(suite.suites ?? [], nextPath));
	}
	return results;
}

function formatDiff(state: StateResult): string {
	if (state.ok) return "—";
	if (state.diffRatio === null) return "failed";
	return `${(state.diffRatio * 100).toFixed(1)}% of pixels`;
}

async function main() {
	const raw = await readFile(values.input, "utf-8");
	const report = JSON.parse(raw) as PlaywrightJsonReport;
	const states = collectStates(report.suites, []).filter(
		// auth.setup.ts isn't a screenshotted state, just session setup.
		(state) => !state.path.includes("auth.setup.ts"),
	);
	const changed = states.filter((state) => !state.ok);

	const marker = "<!-- visual-report -->";
	const lines: string[] = [marker, "", "## Visual regression report", ""];

	if (values.forceFull) {
		lines.push(
			"_Forced full report (every screenshotted state, not just changes) — this run is proving the comment pipeline itself works end-to-end; future runs on this workflow only list states that actually changed._",
			"",
		);
	}

	const rows = values.forceFull ? states : changed;

	if (rows.length === 0) {
		lines.push(
			`No visual differences detected across ${states.length} screenshotted state(s).`,
		);
	} else {
		lines.push("| State | Result |", "| --- | --- |");
		for (const state of rows) {
			lines.push(`| ${state.path} | ${formatDiff(state)} |`);
		}
		if (!values.forceFull) {
			lines.push(
				"",
				`${changed.length} of ${states.length} screenshotted state(s) changed. Download the "playwright-visual-report" artifact from this run for the actual/expected/diff images.`,
			);
		}
	}

	lines.push(
		"",
		"Both themes' screenshots run on a shared, variably-loaded runner — a change here means real pixels moved, not scheduling noise (unlike perf's latency numbers). If a change is intentional, update baselines with `pnpm test:e2e:visual:update:app` and review the diff of the updated PNGs.",
	);

	const body = lines.join("\n");
	if (values.out) {
		await writeFile(values.out, body);
	} else {
		process.stdout.write(body);
	}
}

main();
