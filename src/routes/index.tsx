import { createFileRoute } from "@tanstack/react-router";
import {
	NodeListPage,
	nodeListLoader,
} from "#/features/nodes/routes/node-list";

export const Route = createFileRoute("/")({
	loader: nodeListLoader,
	component: NodeListPage,
});
