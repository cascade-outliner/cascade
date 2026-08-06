/**
 * Custom statuses (#576): user-defined, single-select per node, beyond the
 * binary task completion. Unlike tags (many per node, matched by name), a
 * node points at exactly one status row by id, so the server denormalizes
 * the status into each row it sends.
 */

/** A status as the API sends it, denormalized onto every node row. */
export interface StatusSummary {
	id: string;
	name: string;
	color: string;
}

/** Longest allowed status name (after trimming), enforced in both the status
 * editor UI and the server's createStatus input schema. */
export const MAX_STATUS_LENGTH = 64;

/** The colors a status can be tinted with. Same palette as tag pills, so
 * both reuse the hand-tuned `hue` variant in
 * features/tags/components/tag-pill.styles.ts. */
export const STATUS_COLORS = [
	"sky",
	"emerald",
	"amber",
	"violet",
	"rose",
	"teal",
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

/** Falls back to the first color for values written by an older/newer client
 * rather than rendering an unstyled pill. */
export function toStatusColor(color: string): StatusColor {
	return (STATUS_COLORS as readonly string[]).includes(color)
		? (color as StatusColor)
		: STATUS_COLORS[0];
}

/** Rotates through the palette so a user's first statuses look distinct
 * without asking them to pick a color. */
export function nextStatusColor(existingCount: number): StatusColor {
	return STATUS_COLORS[existingCount % STATUS_COLORS.length];
}
