import { createFileRoute } from "@tanstack/react-router";
import {
	NodeListPage,
	nodeListBeforeLoad,
	nodeListLoader,
} from "#/features/nodes/routes/node-list";

export const Route = createFileRoute("/node/")({
	beforeLoad: nodeListBeforeLoad,
	loader: nodeListLoader,
	component: NodeListPage,
});
