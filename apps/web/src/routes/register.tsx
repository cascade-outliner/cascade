import { createFileRoute, redirect } from "@tanstack/react-router";
import { appRegisterUrl } from "#/lib/app-url";

export const Route = createFileRoute("/register")({
	beforeLoad: () => {
		throw redirect({ href: appRegisterUrl });
	},
	component: () => null,
});
