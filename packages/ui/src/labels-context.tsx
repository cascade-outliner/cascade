import { createContext, type ReactNode, use } from "react";

export interface UiLabels {
	preAlphaBannerPrefix: string;
	preAlphaBannerEmphasis: string;
	preAlphaBannerSuffix: string;
	loading: string;
	dismissToast: string;
	calendarToday: string;
	calendarTomorrow: string;
	calendarNextWeek: string;
	calendarClear: string;
	calendarPreviousMonth: string;
	calendarNextMonth: string;
}

export const defaultUiLabels: UiLabels = {
	preAlphaBannerPrefix: "Cascade is in",
	preAlphaBannerEmphasis: "pre-alpha",
	preAlphaBannerSuffix: "- expect bugs and breaking changes.",
	loading: "Loading",
	dismissToast: "Dismiss",
	calendarToday: "Today",
	calendarTomorrow: "Tomorrow",
	calendarNextWeek: "Next week",
	calendarClear: "Clear",
	calendarPreviousMonth: "Previous month",
	calendarNextMonth: "Next month",
};

const UiLabelsContext = createContext<UiLabels | null>(null);

export function UiLabelsProvider({
	labels,
	children,
}: {
	labels: UiLabels;
	children: ReactNode;
}) {
	return <UiLabelsContext value={labels}>{children}</UiLabelsContext>;
}

export function useUiLabels(): UiLabels {
	return use(UiLabelsContext) ?? defaultUiLabels;
}
