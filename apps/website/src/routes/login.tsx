import { createFileRoute, redirect } from "@tanstack/react-router";
import { appLoginUrl } from "#/lib/app-url";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		throw redirect({ href: appLoginUrl });
	},
	component: () => null,
});
