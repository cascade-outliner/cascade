import type { client } from "#/orpc/client";

export type NodeDetailData = Awaited<ReturnType<typeof client.nodes.get>>;
