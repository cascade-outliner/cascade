import type { DriveStep } from "driver.js";
import { m } from "#/paraglide/messages.js";
import type { OnboardingSampleNodeIds } from "@/features/settings/model/settings.schema";

/**
 * Anchors for `[data-onboarding]` attributes placed on the real UI elements
 * (outside the tree) the tour spotlights. Kept as a single source of truth
 * so the tour steps below and the attributes on those elements can't drift
 * apart silently.
 */
export const onboardingAnchors = {
	filtersMenu: "filters-menu-trigger",
	quickOpen: "quick-open-trigger",
	userMenu: "user-menu-trigger",
} as const;

/** Builds the element selector for a seeded sample-outline node by id,
 * matching the `data-node-id` attribute every tree row carries regardless of
 * edit state (`packages/outliner`'s `row-drag-and-drop.tsx`). Note: a node's
 * DOM `id` attribute is set only while that specific node is being actively
 * text-edited (see `NodeEditor`), so it isn't a usable anchor here. */
function nodeSelector(id: string): string {
	return `[data-node-id="${id}"]`;
}

/**
 * Driver.js step config for the first-run tour. The first step has no
 * `element`, which driver.js renders as a centered, unanchored popover.
 * Remaining steps spotlight the seeded onboarding sample outline's nodes
 * (see `seedOnboardingContent`) — carrying the actual explanations as
 * driver.js popovers rather than as the nodes' own text — followed by a
 * few real header controls (Filters, Quick Open, the profile menu). Steps
 * whose sample node id isn't available (an account that predates this
 * feature, or a node the user already deleted) are simply omitted.
 */
export function onboardingSteps(
	sampleNodeIds: OnboardingSampleNodeIds,
): DriveStep[] {
	const steps: DriveStep[] = [
		{
			popover: {
				title: m.onboarding_tour_welcome_title(),
				description: m.onboarding_tour_welcome_description(),
			},
		},
	];

	if (sampleNodeIds.createNode) {
		steps.push({
			element: nodeSelector(sampleNodeIds.createNode),
			popover: {
				title: m.onboarding_tour_add_node_title(),
				description: m.onboarding_tour_add_node_description(),
				side: "bottom",
			},
		});
	}
	if (sampleNodeIds.indentNode) {
		steps.push({
			element: nodeSelector(sampleNodeIds.indentNode),
			popover: {
				title: m.onboarding_tour_indent_title(),
				description: m.onboarding_tour_indent_description(),
				side: "bottom",
			},
		});
	}
	if (sampleNodeIds.focusDot) {
		steps.push({
			element: nodeSelector(sampleNodeIds.focusDot),
			popover: {
				title: m.onboarding_tour_focus_dot_title(),
				description: m.onboarding_tour_focus_dot_description(),
				side: "bottom",
			},
		});
	}
	if (sampleNodeIds.task) {
		steps.push({
			element: nodeSelector(sampleNodeIds.task),
			popover: {
				title: m.onboarding_tour_task_title(),
				description: m.onboarding_tour_task_description(),
				side: "bottom",
			},
		});
	}
	if (sampleNodeIds.tagged) {
		steps.push({
			element: nodeSelector(sampleNodeIds.tagged),
			popover: {
				title: m.onboarding_tour_tagged_title(),
				description: m.onboarding_tour_tagged_description(),
				side: "bottom",
			},
		});
	}

	steps.push(
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
	);

	return steps;
}
