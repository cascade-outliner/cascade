/**
 * Node color coding (#656). Nodes can be assigned either a named palette
 * color or any custom hex color (#rrggbb / #rgb). Both are stored as plain
 * strings in the `color` column and rendered as a left-border tint in the
 * tree view.
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

/** CSS hex color string: #rgb, #rrggbb (case-insensitive). */
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
	return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** Returns true for any value the color field accepts (palette name or hex). */
export function isValidNodeColor(value: unknown): value is string {
	return isNodeColorName(value) || isHexColor(value);
}

/** Tailwind border-color class for each named palette color. */
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

/**
 * Canonical hex value for each named palette color, used to pre-fill the
 * native color-picker (`<input type="color">`) when the user switches from a
 * preset to a custom color.
 */
export const NODE_COLOR_HEX: Record<NodeColorName, string> = {
	red: "#f87171",
	orange: "#fb923c",
	yellow: "#facc15",
	green: "#22c55e",
	blue: "#60a5fa",
	purple: "#c084fc",
	pink: "#f472b6",
	gray: "#9ca3af",
};
