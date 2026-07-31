import { isSingleEmoji } from "@cascade/outliner/node-icon";
import { z } from "zod";

/** A single emoji used as a node's custom icon (see #557). */
export const iconSchema = z
	.string()
	.refine(isSingleEmoji, { message: "Icon must be a single emoji" });
