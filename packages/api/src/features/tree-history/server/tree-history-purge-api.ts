import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../../env";
import { purgeTreeHistory } from "./purge-tree-history";

const purgeRequestSchema = z.object({
	days: z.number().int().nonnegative().default(30),
	dryRun: z.boolean().default(false),
});

function tokenMatches(authorization: string | null, expected: string): boolean {
	const prefix = "Bearer ";
	if (!authorization?.startsWith(prefix)) return false;
	const actualBuffer = Buffer.from(authorization.slice(prefix.length));
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

export async function handleTreeHistoryPurgeRequest(
	request: Request,
	configuredToken = env.TREE_HISTORY_PURGE_TOKEN,
): Promise<Response> {
	if (!configuredToken) {
		return Response.json(
			{ error: "Tree history purge API is not configured" },
			{ status: 503 },
		);
	}
	if (!tokenMatches(request.headers.get("authorization"), configuredToken)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let input: z.infer<typeof purgeRequestSchema>;
	try {
		input = purgeRequestSchema.parse(await request.json());
	} catch {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	const result = await purgeTreeHistory(input.days, input.dryRun);
	return Response.json({
		days: input.days,
		dryRun: input.dryRun,
		purgedCount: result.purgedIds.length,
	});
}
