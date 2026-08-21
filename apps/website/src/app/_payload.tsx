import { payloadLayoutRoute } from "@payloadcms/tanstack-start/client";
import { createFileRoute } from "@tanstack/react-router";
import "../payload-foundation.css";
import "@payloadcms/ui/css/app.css";

import {
	getLayoutDataFn,
	serverFunctionHandler,
} from "./_payload/server.functions.js";

export const Route = createFileRoute("/_payload")({
	...payloadLayoutRoute({
		load: getLayoutDataFn,
		serverFunction: serverFunctionHandler,
	}),
	head: () => ({
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Roboto+Mono:wght@100..700&display=swap",
			},
		],
	}),
});
