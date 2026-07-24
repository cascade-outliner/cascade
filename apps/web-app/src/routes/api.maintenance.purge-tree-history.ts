import { handleTreeHistoryPurgeRequest } from "@cascade/api/tree-history-purge-api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/maintenance/purge-tree-history")({
	server: {
		handlers: {
			POST: ({ request }) => handleTreeHistoryPurgeRequest(request),
		},
	},
});
