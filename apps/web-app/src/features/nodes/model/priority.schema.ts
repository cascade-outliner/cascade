import { PRIORITY_NAMES } from "@cascade/outliner/node-priority";
import { z } from "zod";

/** The fixed priority vocabulary; `null` means "no priority" (see #576). */
export const prioritySchema = z.enum(PRIORITY_NAMES);
