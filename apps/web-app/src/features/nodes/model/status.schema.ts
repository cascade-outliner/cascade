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

export const createStatusInputSchema = z.object({
	name: statusNameSchema,
	/** Omitted by the inline picker, which lets the server rotate the palette. */
	color: statusColorSchema.optional(),
});

export const setNodeStatusInputSchema = z.object({
	id: z.string(),
	statusId: z.string().nullable(),
});
