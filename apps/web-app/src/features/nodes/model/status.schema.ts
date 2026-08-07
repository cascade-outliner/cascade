import {
	MAX_STATUS_LENGTH,
	STATUS_COLORS,
} from "@cascade/outliner/node-statuses";
import { z } from "zod";

const statusNameSchema = z
	.string()
	.trim()
	.min(1, "status name cannot be empty")
	.max(
		MAX_STATUS_LENGTH,
		`status name exceeds ${MAX_STATUS_LENGTH} characters`,
	);

export const statusColorSchema = z.enum(STATUS_COLORS);

export const listStatusesInputSchema = z.object({
	boardId: z.string(),
});

export const createStatusInputSchema = z.object({
	boardId: z.string(),
	name: statusNameSchema,
	/** Omitted to let the server rotate through the palette. */
	color: statusColorSchema.optional(),
});

/** Renaming, recoloring, and hiding share one procedure: the settings panel
 * is the only place any of these happen, and it edits the same row. */
export const updateStatusInputSchema = z.object({
	id: z.string(),
	boardId: z.string(),
	name: statusNameSchema.optional(),
	color: statusColorSchema.optional(),
	hidden: z.boolean().optional(),
});

export const deleteStatusInputSchema = z.object({
	id: z.string(),
	boardId: z.string(),
});

export const setNodeStatusInputSchema = z.object({
	id: z.string(),
	boardId: z.string(),
	statusId: z.string().nullable(),
});
