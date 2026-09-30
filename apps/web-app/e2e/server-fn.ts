import { createHash } from "node:crypto";
import type { Route } from "@playwright/test";
import { toCrossJSON } from "seroval";

// TanStack Start derives the RPC id from the server file + export name, but
// differently per mode: dev base64url-encodes them as JSON, production (CI)
// sha256-hashes `<app-relative file>--<handler>`.
export function serverFnUrl(
	file: string,
	exportName: string,
): (url: URL) => boolean {
	const handler = `${exportName}_createServerFn_handler`;
	const dev = Buffer.from(
		JSON.stringify({ file: `/${file}?tss-serverfn-split`, export: handler }),
	).toString("base64url");
	const prod = createHash("sha256").update(`${file}--${handler}`).digest("hex");
	return (url) =>
		url.pathname.endsWith(`/_serverFn/${dev}`) ||
		url.pathname.endsWith(`/_serverFn/${prod}`);
}

export async function fulfillResult(route: Route, result: unknown) {
	await route.fulfill({
		contentType: "application/json",
		headers: { "x-tss-serialized": "true" },
		body: JSON.stringify(
			toCrossJSON({ result, error: undefined, context: {} }),
		),
	});
}
