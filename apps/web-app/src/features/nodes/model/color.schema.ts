import { isValidNodeColor } from "@cascade/outliner/node-color";
import { z } from "zod";

/**
 * A node color value: either a named palette color (`red`, `blue`, …) or a
 * custom hex string (`#rrggbb` / `#rgb`). See `isValidNodeColor` for the
 * full acceptance rule (#656).
 */
export const colorSchema = z.string().refine(isValidNodeColor, {
	message: "Color must be a palette name or a CSS hex color (#rgb / #rrggbb)",
});
