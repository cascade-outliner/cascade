import { createFileRoute } from "@tanstack/react-router";
import { generateSpec } from "#/orpc/openapi.ts";

export const Route = createFileRoute("/api/docs/openapi-json")({
	server: {
		handlers: {
			GET: async () => {
				const spec = await generateSpec();

				return Response.json(spec);
			},
		},
	},
});
