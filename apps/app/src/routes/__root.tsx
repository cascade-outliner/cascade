import { OutlinerLabelsProvider } from "@cascade/outliner/labels-context";
import { defaultUiLabels, UiLabelsProvider } from "@cascade/ui/labels-context";
import { Toaster } from "@cascade/ui/toast";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	redirect,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import { getSession } from "@/auth/session";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { SettingsProvider } from "@/ui/settings-context";
import { UserMenu } from "@/ui/user-menu";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ href: `${webUrl}/login` });
		}
		return { user: session.user };
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Cascade",
			},
			{
				name: "theme-color",
				content: "#f9e4d6",
			},
		],
		scripts: [
			{
				children:
					'if(JSON.parse(localStorage.settings||"{}").dark??matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")',
			},
			...(import.meta.env.PROD
				? [
						{
							defer: true,
							src: "https://rybbit.patrickroelofs.com/api/script.js",
							"data-site-id": "15be8ae7c0e2",
						},
					]
				: []),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
		],
	}),
	errorComponent: GenericErrorComponent,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang={getLocale()} suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="bg-super-ginger text-dark-grey dark:bg-dark-grey dark:text-super-ginger">
				<UiLabelsProvider
					labels={{
						...defaultUiLabels,
						loading: m.ui_loading(),
						dismissToast: m.ui_dismiss_toast(),
					}}
				>
					<OutlinerLabelsProvider
						labels={{
							toggleExpand: m.outliner_toggle_expand(),
							toggleCollapse: m.outliner_toggle_collapse(),
							taskCompleted: m.outliner_task_completed(),
							dragToReorder: m.outliner_drag_handle(),
							editNodeText: m.outliner_edit_node_text(),
							convertInto: m.outliner_convert_into(),
							delete: m.outliner_delete(),
							emptyTree: m.outliner_empty_tree(),
							addNode: m.outliner_add_node(),
							nodeTypeLabels: {
								text: m.outliner_type_text(),
								task: m.outliner_type_task(),
							},
						}}
					>
						<SettingsProvider>
							<Toaster>
								{children}
								<UserMenu />
							</Toaster>
						</SettingsProvider>
					</OutlinerLabelsProvider>
				</UiLabelsProvider>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-left",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
