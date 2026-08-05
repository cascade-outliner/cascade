import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { A11yImpact, A11yScanResult } from "./support/a11y";
import { cliArgs } from "./support/cli-args";

const { values } = parseArgs({
	args: cliArgs(),
	options: {
		resultsDir: { type: "string", default: "a11y-results" },
		out: { type: "string" },
	},
});

const IMPACT_ORDER: readonly A11yImpact[] = [
	"critical",
	"serious",
	"moderate",
	"minor",
];
const BLOCKING: ReadonlySet<A11yImpact> = new Set(["critical", "serious"]);
const IMPACT_EMOJI: Record<A11yImpact, string> = {
	critical: "🟥",
	serious: "🟧",
	moderate: "🟨",
	minor: "⬜",
};

async function readScans(dir: string): Promise<A11yScanResult[]> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return [];
	}
	const scans: A11yScanResult[] = [];
	for (const entry of entries.filter((f) => f.endsWith(".json")).sort()) {
		const raw = await readFile(path.join(dir, entry), "utf-8");
		scans.push(JSON.parse(raw) as A11yScanResult);
	}
	return scans;
}

async function main() {
	const scans = await readScans(values.resultsDir);

	const lines: string[] = [];
	lines.push("<!-- a11y-report -->");
	lines.push("### Accessibility scan (axe-core)");
	lines.push("");

	if (scans.length === 0) {
		lines.push(
			"_No a11y scan results found — see `.github/workflows/a11y.yml` for how this runs._",
		);
	} else {
		const totalBlocking = scans.reduce(
			(sum, scan) =>
				sum +
				scan.violations.filter((v) => v.impact && BLOCKING.has(v.impact))
					.length,
			0,
		);

		lines.push(
			totalBlocking === 0
				? "✅ No critical/serious violations across the scanned pages."
				: `❌ ${totalBlocking} critical/serious violation${totalBlocking === 1 ? "" : "s"} found — these fail CI (see \`pnpm test:a11y:app\`).`,
		);
		lines.push("");
		lines.push("| Page | Critical | Serious | Moderate | Minor |");
		lines.push("| --- | --- | --- | --- | --- |");

		for (const scan of scans) {
			const counts = Object.fromEntries(
				IMPACT_ORDER.map((impact) => [
					impact,
					scan.violations.filter((v) => v.impact === impact).length,
				]),
			) as Record<A11yImpact, number>;
			lines.push(
				`| ${scan.name} | ${counts.critical} | ${counts.serious} | ${counts.moderate} | ${counts.minor} |`,
			);
		}

		const withViolations = scans.filter((scan) => scan.violations.length > 0);
		if (withViolations.length > 0) {
			lines.push("");
			lines.push("<details><summary>Violation details</summary>");
			lines.push("");
			for (const scan of withViolations) {
				lines.push(`**${scan.name}**`);
				lines.push("");
				for (const violation of scan.violations) {
					const emoji = violation.impact
						? IMPACT_EMOJI[violation.impact]
						: "⬜";
					lines.push(
						`- ${emoji} \`${violation.id}\` (${violation.impact ?? "unknown"}, ${violation.nodeCount} node${violation.nodeCount === 1 ? "" : "s"}): ${violation.help} — [details](${violation.helpUrl})`,
					);
				}
				lines.push("");
			}
			lines.push("</details>");
		}
	}

	lines.push("");
	lines.push(
		"_Scans the main tree view and the Settings dialog (desktop and mobile full-screen layouts) " +
			"against WCAG 2.0/2.1 A/AA rules via `@axe-core/playwright`. Moderate/minor findings are " +
			"reported here but don't fail CI — see `apps/web-app/e2e/a11y.spec.ts`._",
	);

	const markdown = lines.join("\n");
	console.log(markdown);
	if (values.out) {
		const { writeFile } = await import("node:fs/promises");
		await writeFile(values.out, markdown);
		console.log(`\nWrote report to ${values.out}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
