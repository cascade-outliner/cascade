import { createFileRoute } from "@tanstack/react-router";

const html = `
<!doctype html>
	<html lang="en">
		<head>
			<title>Cascade API Docs</title>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
		</head>
		<body>
			<script id="api-reference" data-url="/api/docs/openapi-json"></script>
			<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
		</body>
</html>`;

export const Route = createFileRoute("/api/docs")({
	server: {
		handlers: {
			GET: () =>
				new Response(html, { headers: { "content-type": "text/html" } }),
		},
	},
});
