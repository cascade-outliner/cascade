import { createFileRoute, redirect } from "@tanstack/react-router";
import { externalAppUrls } from "#/config/external-app";

export const Route = createFileRoute("/register")({
	beforeLoad: () => {
		throw redirect({ href: externalAppUrls.register });
	},
	component: () => null,
});
