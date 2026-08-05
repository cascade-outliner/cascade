import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";

/** axe-core's own ordering, worst first. */
const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"] as const;
export type A11yImpact = (typeof IMPACT_ORDER)[number];

/** Violations at these impact levels fail the scan; `moderate`/`minor` are reported but non-blocking. */
const BLOCKING_IMPACTS = new Set<A11yImpact>(["critical", "serious"]);

export interface A11yViolation {
	id: string;
	impact: A11yImpact | null;
	description: string;
	help: string;
	helpUrl: string;
	nodeCount: number;
}

export interface A11yScanResult {
	name: string;
	url: string;
	timestamp: string;
	violations: A11yViolation[];
}

/**
 * Runs an axe-core scan against WCAG 2.0/2.1 A/AA rules, records a JSON
 * summary under a11y-results/ (read by .github/workflows/a11y.yml's
 * a11y-report.ts to build the PR comment) and as a Playwright test
 * attachment, then fails the test if any critical/serious violations were
 * found. `include` scopes the scan to a subset of the page (e.g. an open
 * dialog) instead of the whole document.
 */
export async function runA11yScan(
	page: Page,
	testInfo: TestInfo,
	name: string,
	options?: { include?: string },
): Promise<void> {
	let builder = new AxeBuilder({ page }).withTags([
		"wcag2a",
		"wcag2aa",
		"wcag21a",
		"wcag21aa",
	]);
	if (options?.include) {
		builder = builder.include(options.include);
	}
	const results = await builder.analyze();

	const violations: A11yViolation[] = results.violations.map((violation) => ({
		id: violation.id,
		impact: (violation.impact as A11yImpact | undefined) ?? null,
		description: violation.description,
		help: violation.help,
		helpUrl: violation.helpUrl,
		nodeCount: violation.nodes.length,
	}));

	const summary: A11yScanResult = {
		name,
		url: page.url(),
		timestamp: new Date().toISOString(),
		violations,
	};

	await testInfo.attach(`a11y-${name}`, {
		body: JSON.stringify(summary, null, 2),
		contentType: "application/json",
	});
	await writeResultsFile(`${name}.json`, summary);

	const blocking = violations.filter(
		(violation) => violation.impact && BLOCKING_IMPACTS.has(violation.impact),
	);
	expect(
		blocking,
		blocking
			.map(
				(v) =>
					`[${v.impact}] ${v.id}: ${v.help} (${v.nodeCount} node${v.nodeCount === 1 ? "" : "s"}) — ${v.helpUrl}`,
			)
			.join("\n"),
	).toEqual([]);
}

/** Writes JSON results under apps/web-app/a11y-results/ (gitignored), returning the path written. */
async function writeResultsFile(
	fileName: string,
	data: unknown,
): Promise<string> {
	const outPath = path.join(process.cwd(), "a11y-results", fileName);
	await mkdir(path.dirname(outPath), { recursive: true });
	await writeFile(outPath, JSON.stringify(data, null, 2));
	return outPath;
}
