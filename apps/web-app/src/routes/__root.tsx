import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { GenericErrorComponent } from "@/app/generic-error";
import { RootDocument } from "@/app/root-document";
import { buildRootHead } from "@/app/root-head";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";

interface AppRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
	head: ({ matches }) => buildRootHead(matches),
	errorComponent: GenericErrorComponent,
	shellComponent: RootDocument,
});
