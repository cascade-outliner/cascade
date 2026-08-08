import { isNodeColorName } from "@cascade/outliner/node-color";
import { z } from "zod";

/** A named node color from the fixed palette (see #656). */
export const colorSchema = z
	.string()
	.refine(isNodeColorName, { message: "Color must be a valid palette name" });
