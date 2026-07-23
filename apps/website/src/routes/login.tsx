import { createFileRoute, redirect } from "@tanstack/react-router";
import { externalAppUrls } from "#/config/external-app";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		throw redirect({ href: externalAppUrls.login });
	},
	component: () => null,
});
