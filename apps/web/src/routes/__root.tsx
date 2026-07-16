import { OutlinerLabelsProvider } from "@cascade/outliner/labels-context";
import { defaultUiLabels, UiLabelsProvider } from "@cascade/ui/labels-context";
import { PreAlphaBanner } from "@cascade/ui/pre-alpha-banner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { seoHead } from "#/lib/seo";
import { m } from "#/paraglide/messages.js";
import { getLocale, getTextDirection } from "#/paraglide/runtime.js";

import "@fontsource-variable/bitter/wght-italic.css";
import appCss from "../styles.css?url";

const home = seoHead(m.home_seo_title(), m.home_seo_description());

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "Cascade" },
			{ name: "twitter:card", content: "summary_large_image" },
			...home.meta,
		],
		scripts: [
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
			...home.links,
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang={getLocale()} dir={getTextDirection()}>
			<head>
				<HeadContent />
			</head>
			<body className="bg-super-ginger text-dark-grey">
				<UiLabelsProvider
					labels={{
						...defaultUiLabels,
						preAlphaBannerPrefix: m.ui_pre_alpha_prefix(),
						preAlphaBannerEmphasis: m.ui_pre_alpha_emphasis(),
						preAlphaBannerSuffix: m.ui_pre_alpha_suffix(),
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
							removeTagAria: m.outliner_remove_tag_aria(),
							tagSuggestions: m.outliner_tag_suggestions(),
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
							filtersClear: m.filters_bar_clear(),
						}}
					>
						<PreAlphaBanner />
						{children}
					</OutlinerLabelsProvider>
				</UiLabelsProvider>
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
				<Scripts />
			</body>
		</html>
	);
}
