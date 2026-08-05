import type { DriveStep } from "driver.js";
import { m } from "#/paraglide/messages.js";

/**
 * Anchors for `[data-onboarding]` attributes placed on the real UI elements
 * the tour spotlights. Kept as a single source of truth so the tour steps
 * below and the attributes on those elements can't drift apart silently.
 */
export const onboardingAnchors = {
	addNode: "add-node-button",
	filtersMenu: "filters-menu-trigger",
	quickOpen: "quick-open-trigger",
	userMenu: "user-menu-trigger",
} as const;

/** Driver.js step config for the first-run tour. The first step has no
 * `element`, which driver.js renders as a centered, unanchored popover. */
export function onboardingSteps(): DriveStep[] {
	return [
		{
			popover: {
				title: m.onboarding_tour_welcome_title(),
				description: m.onboarding_tour_welcome_description(),
			},
		},
		{
			element: `[data-onboarding="${onboardingAnchors.addNode}"]`,
			popover: {
				title: m.onboarding_tour_add_node_title(),
				description: m.onboarding_tour_add_node_description(),
				side: "top",
			},
		},
		{
			element: `[data-onboarding="${onboardingAnchors.filtersMenu}"]`,
			popover: {
				title: m.onboarding_tour_filters_title(),
				description: m.onboarding_tour_filters_description(),
				side: "bottom",
			},
		},
		{
			element: `[data-onboarding="${onboardingAnchors.quickOpen}"]`,
			popover: {
				title: m.onboarding_tour_quick_open_title(),
				description: m.onboarding_tour_quick_open_description(),
				side: "bottom",
			},
		},
		{
			element: `[data-onboarding="${onboardingAnchors.userMenu}"]`,
			popover: {
				title: m.onboarding_tour_user_menu_title(),
				description: m.onboarding_tour_user_menu_description(),
				side: "bottom",
				align: "end",
			},
		},
	];
}
