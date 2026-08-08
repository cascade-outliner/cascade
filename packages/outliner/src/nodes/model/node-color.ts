/**
 * Node color coding (#656). A small fixed palette of named colors that can be
 * assigned to any node, displayed as a left-border tint in the tree view for
 * at-a-glance visual categorization. Fixed vocabulary rather than free input,
 * to stay visually consistent with the rest of the design system.
 */

export const NODE_COLOR_NAMES = [
	"red",
	"orange",
	"yellow",
	"green",
	"blue",
	"purple",
	"pink",
	"gray",
] as const;

export type NodeColorName = (typeof NODE_COLOR_NAMES)[number];

export function isNodeColorName(value: unknown): value is NodeColorName {
	return (NODE_COLOR_NAMES as readonly unknown[]).includes(value);
}

/** Tailwind border-color class for each named color, used in the tree row. */
export const NODE_COLOR_BORDER: Record<NodeColorName, string> = {
	red: "border-red-400",
	orange: "border-orange-400",
	yellow: "border-yellow-400",
	green: "border-green-500",
	blue: "border-blue-400",
	purple: "border-purple-400",
	pink: "border-pink-400",
	gray: "border-gray-400",
};

/** Tailwind background-color class (subtle tint) for each named color. */
export const NODE_COLOR_BG: Record<NodeColorName, string> = {
	red: "bg-red-50/60",
	orange: "bg-orange-50/60",
	yellow: "bg-yellow-50/60",
	green: "bg-green-50/60",
	blue: "bg-blue-50/60",
	purple: "bg-purple-50/60",
	pink: "bg-pink-50/60",
	gray: "bg-gray-50/60",
};
