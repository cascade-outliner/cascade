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
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";
import { getSession } from "@/auth/session";
import type { SettingsPatch } from "@/core/settings/settings-patch-schema";
import { orpc } from "@/orpc/client";
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
	loader: async ({ context: { queryClient } }) => {
		const settings = await queryClient
			.ensureQueryData(orpc.settings.get.queryOptions())
			.catch((): SettingsPatch => ({}));
		return { settings };
	},
	head: ({ loaderData }) => ({
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
			...(loaderData?.settings.dark === undefined
				? [
						{
							children:
								'if(matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")',
						},
					]
				: []),
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
	const { settings } = Route.useLoaderData();
	return (
		<html
			lang={getLocale()}
			className={settings.dark ? "dark" : undefined}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className="bg-super-ginger text-dark-grey dark:bg-dark-grey dark:text-super-ginger">
				<NuqsAdapter>
					<UiLabelsProvider
						labels={{
							...defaultUiLabels,
							loading: m.ui_loading(),
							dismissToast: m.ui_dismiss_toast(),
							calendarToday: m.ui_calendar_today(),
							calendarTomorrow: m.ui_calendar_tomorrow(),
							calendarNextWeek: m.ui_calendar_next_week(),
							calendarClear: m.ui_calendar_clear(),
							calendarPreviousMonth: m.ui_calendar_previous_month(),
							calendarNextMonth: m.ui_calendar_next_month(),
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
								emptyFilterResults: m.outliner_empty_filter_results(),
								addNode: m.outliner_add_node(),
								setDueDate: m.outliner_set_due_date(),
								changeDueDate: m.outliner_change_due_date(),
								changeDueDateAria: m.outliner_change_due_date_aria(),
								dueToday: m.outliner_due_today(),
								dueTomorrow: m.outliner_due_tomorrow(),
								dueYesterday: m.outliner_due_yesterday(),
								addTag: m.outliner_add_tag(),
								manageTags: m.outliner_manage_tags(),
								tagsInputPlaceholder: m.outliner_tags_input_placeholder(),
								tagHintNavigate: m.outliner_tag_hint_navigate(),
								tagHintToggle: m.outliner_tag_hint_toggle(),
								createTag: m.outliner_create_tag(),
								deleteTagAria: m.outliner_delete_tag_aria(),
								deleteTagConfirmBody: m.outliner_delete_tag_confirm_body(),
								cancel: m.outliner_cancel(),
								nodeTypeLabels: {
									text: m.outliner_type_text(),
									task: m.outliner_type_task(),
								},
								filtersTrigger: m.filters_bar_trigger(),
								filtersDueDateGroup: m.filters_bar_due_date_group(),
								filtersDueToday: m.filters_bar_due_today(),
								filtersRemoveDueToday: m.filters_bar_remove_due_today(),
								filtersDueThisWeek: m.filters_bar_due_this_week(),
								filtersRemoveDueThisWeek: m.filters_bar_remove_due_this_week(),
								filtersDueOnDate: m.filters_bar_due_on_date(),
								filtersDueOn: m.filters_bar_due_on(),
								filtersRemoveDueOnDate: m.filters_bar_remove_due_on_date(),
								filtersTasksGroup: m.filters_bar_tasks_group(),
								filtersHideCompleted: m.filters_bar_hide_completed(),
								filtersRemoveHideCompleted:
									m.filters_bar_remove_hide_completed(),
								filtersClear: m.filters_bar_clear(),
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
				</NuqsAdapter>
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
