import { createFileRoute } from "@tanstack/react-router";
import {
	NodeDetailPage,
	nodeDetailBeforeLoad,
	nodeDetailLoader,
} from "#/features/nodes/routes/node-detail";

export const Route = createFileRoute("/node/$nodeId")({
	beforeLoad: nodeDetailBeforeLoad,
	loader: nodeDetailLoader,
	component: NodeDetailPage,
});
