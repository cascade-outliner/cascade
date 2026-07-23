import { createRootRoute } from "@tanstack/react-router";
import { RootDocument } from "#/app/root-document";
import { createRootHead } from "#/app/root-head";

export const Route = createRootRoute({
	head: createRootHead,
	shellComponent: RootDocument,
});
