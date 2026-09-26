import type { SyncState } from "./types.ts";

/** The anonymous id this browser syncs under, created on first use and kept in sync state. */
export async function getOrCreateWorkspaceId(
	state: SyncState,
): Promise<string> {
	const meta = await state.getMeta();
	if (meta.workspaceId) {
		return meta.workspaceId;
	}
	const workspaceId = crypto.randomUUID();
	await state.setMeta({ workspaceId });
	return workspaceId;
}
