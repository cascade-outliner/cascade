import { createFileRoute } from "@tanstack/react-router";
import {
	NodeDetailPage,
	nodeDetailLoader,
} from "#/features/nodes/routes/node-detail";

export const Route = createFileRoute("/node/$nodeId")({
	loader: nodeDetailLoader,
	component: NodeDetailPage,
});
