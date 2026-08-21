import { db, nodeQueries } from "@cascade/db";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const nodeIdShape = { id: z.uuid().describe("The node's id") };

const nodeContentShape = {
	parentId: z
		.uuid()
		.nullish()
		.describe("Id of the parent node, or null for a root node"),
	content: z.unknown().nullish().describe("The node's content"),
	expanded: z
		.boolean()
		.optional()
		.describe("Whether the node is expanded in the tree"),
};

function toolResult(data: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function notFoundResult(id: string) {
	return {
		content: [{ type: "text" as const, text: `Node ${id} not found` }],
		isError: true,
	};
}

export function createNodesServer(userId: string) {
	const server = new McpServer({ name: "cascade", version: "0.0.0" });

	server.registerTool(
		"list_nodes",
		{
			title: "List nodes",
			description: "List all nodes in the current user's outliner tree",
		},
		async () => toolResult({ nodes: await nodeQueries.list(db, userId) }),
	);

	server.registerTool(
		"get_node",
		{
			title: "Get node",
			description: "Get a single node by id",
			inputSchema: nodeIdShape,
		},
		async ({ id }) => {
			const node = await nodeQueries.get(db, userId, id);
			return node ? toolResult(node) : notFoundResult(id);
		},
	);

	server.registerTool(
		"create_node",
		{
			title: "Create node",
			description: "Create a new node, optionally under a parent node",
			inputSchema: nodeContentShape,
		},
		async (input) => toolResult(await nodeQueries.create(db, userId, input)),
	);

	server.registerTool(
		"update_node",
		{
			title: "Update node",
			description: "Update a node's parent, content, or expanded state",
			inputSchema: { ...nodeIdShape, ...nodeContentShape },
		},
		async ({ id, ...input }) => {
			const node = await nodeQueries.update(db, userId, id, input);
			return node ? toolResult(node) : notFoundResult(id);
		},
	);

	server.registerTool(
		"delete_node",
		{
			title: "Delete node",
			description: "Delete a node by id",
			inputSchema: nodeIdShape,
		},
		async ({ id }) => {
			const success = await nodeQueries.delete(db, userId, id);
			return success ? toolResult({ success }) : notFoundResult(id);
		},
	);

	return server;
}
