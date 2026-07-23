import { PreAlphaBanner } from "@cascade/ui/pre-alpha-banner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { getLocale, getTextDirection } from "#/paraglide/runtime.js";
import { AppLabelsProvider } from "./app-labels-provider";

import "@fontsource-variable/bitter/index.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";

export function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang={getLocale()} dir={getTextDirection()}>
			<head>
				<HeadContent />
			</head>
			<body className="bg-canvas text-ink">
				<AppLabelsProvider>
					<PreAlphaBanner />
					{children}
				</AppLabelsProvider>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
