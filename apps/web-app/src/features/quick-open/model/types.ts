import type { client } from "@/orpc/client";

export type QuickOpenResult = Awaited<
	ReturnType<typeof client.nodes.quickOpen>
>[number];
