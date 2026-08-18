/// <reference types="vite/client" />

import { createFileRoute, Outlet } from "@tanstack/react-router";

import styles from "./_frontend/styles.css?url";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";

export const Route = createFileRoute("/_frontend")({
	component: FrontendLayout,
	head: () => ({
		links: [{ rel: "stylesheet", href: styles }],
	}),
});

function FrontendLayout() {
	return <Outlet />;
}
