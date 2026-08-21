#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cascadeClient } from "./client.ts";

const server = new McpServer({
	name: "cascade-mcp",
	version: "0.0.0",
});

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

server.registerTool(
	"list_nodes",
	{
		title: "List nodes",
		description: "List all nodes in the current user's outliner tree",
	},
	async () => toolResult(await cascadeClient.listNodes()),
);

server.registerTool(
	"get_node",
	{
		title: "Get node",
		description: "Get a single node by id",
		inputSchema: nodeIdShape,
	},
	async ({ id }) => toolResult(await cascadeClient.getNode(id)),
);

server.registerTool(
	"create_node",
	{
		title: "Create node",
		description: "Create a new node, optionally under a parent node",
		inputSchema: nodeContentShape,
	},
	async (input) => toolResult(await cascadeClient.createNode(input)),
);

server.registerTool(
	"update_node",
	{
		title: "Update node",
		description: "Update a node's parent, content, or expanded state",
		inputSchema: { ...nodeIdShape, ...nodeContentShape },
	},
	async ({ id, ...input }) =>
		toolResult(await cascadeClient.updateNode(id, input)),
);

server.registerTool(
	"delete_node",
	{
		title: "Delete node",
		description: "Delete a node by id",
		inputSchema: nodeIdShape,
	},
	async ({ id }) => toolResult(await cascadeClient.deleteNode(id)),
);

await server.connect(new StdioServerTransport());
