import {
	minimalNodeCapabilities,
	type NodeCapabilityId,
	nodeCapabilityIds,
	resolveNodeCapabilities,
} from "@cascade/outliner/node-capabilities";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userSettings } from "./settings-table";

const storedCapabilitiesSchema = z.array(z.enum(nodeCapabilityIds));

export async function getEnabledNodeCapabilities(
	userId: string,
): Promise<ReadonlySet<NodeCapabilityId>> {
	const [row] = await db
		.select({ settings: userSettings.settings })
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);
	const parsed = storedCapabilitiesSchema.safeParse(
		row?.settings.enabledNodeCapabilities,
	);
	const enabled = parsed.success ? parsed.data : minimalNodeCapabilities;
	return new Set(resolveNodeCapabilities(enabled));
}

export async function assertNodeCapabilityEnabled(
	userId: string,
	capability: NodeCapabilityId,
): Promise<void> {
	const enabled = await getEnabledNodeCapabilities(userId);
	if (!enabled.has(capability)) {
		throw new ORPCError("FORBIDDEN", {
			status: 403,
			message: `Node capability disabled: ${capability}`,
		});
	}
}
