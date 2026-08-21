import { createFileRoute } from "@tanstack/react-router";

const scalarConfig = {
	telemetry: false,
	hideSearch: true,
	mcp: { disabled: true },
	showDeveloperTools: "never",
	hiddenClients: {
		c: ["libcurl"],
		clojure: ["clj_http"],
		csharp: ["httpclient", "restsharp"],
		dart: ["http"],
		fsharp: ["httpclient"],
		go: ["native"],
		http: ["http1.1"],
		java: ["asynchttp", "nethttp", "okhttp", "unirest"],
		js: ["axios", "fetch", "jquery", "ofetch", "xhr"],
		julia: ["http"],
		kotlin: ["okhttp"],
		node: ["axios", "fetch", "ofetch", "undici"],
		objc: ["nsurlsession"],
		ocaml: ["cohttp"],
		php: ["curl", "guzzle", "laravel"],
		powershell: ["restmethod", "webrequest"],
		python: ["aiohttp", "httpx_async", "httpx_sync", "python3", "requests"],
		r: ["httr2"],
		ruby: ["native"],
		rust: ["reqwest"],
		shell: ["httpie", "wget"],
		swift: ["nsurlsession"],
	},
};

const html = `
<!doctype html>
	<html lang="en">
		<head>
			<title>Cascade API Docs</title>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
		</head>
		<body>
			<script
				id="api-reference"
				data-url="/api/docs/openapi-json"
				data-configuration='${JSON.stringify(scalarConfig)}'
			></script>
			<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
		</body>
</html>`;

export const Route = createFileRoute("/api/docs/$")({
	server: {
		handlers: {
			GET: () =>
				new Response(html, { headers: { "content-type": "text/html" } }),
		},
	},
});
