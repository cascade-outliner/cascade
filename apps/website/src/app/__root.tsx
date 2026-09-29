import { withPayloadRoot } from "@payloadcms/tanstack-start/client";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export const Route = createRootRoute({
	shellComponent: withPayloadRoot(FrontendRoot),
});

const TanStackDevtoolsPanel = import.meta.env.DEV
	? lazy(async () => {
			const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] =
				await Promise.all([
					import("@tanstack/react-devtools"),
					import("@tanstack/react-router-devtools"),
				]);
			return {
				default: () => (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				),
			};
		})
	: null;

function FrontendRoot({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				{TanStackDevtoolsPanel && (
					<Suspense fallback={null}>
						<TanStackDevtoolsPanel />
					</Suspense>
				)}
				<Scripts />
			</body>
		</html>
	);
}
