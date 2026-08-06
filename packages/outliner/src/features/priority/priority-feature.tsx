import type { PriorityName } from "../../nodes/model/node-priority";
import type { OutlinerFeature } from "../model/outliner-feature.types";
import { NodePriorityPill } from "./components/node-priority-pill";
import { PriorityMenuItem } from "./components/priority-menu-item";

export interface PriorityFeatureContext {
	priority: PriorityName | null;
	onSetPriority: (priority: PriorityName | null) => void;
}

/** Priority (#576): a trailing pill on rows that have one, plus a
 * "Set/Change priority" context-menu submenu. */
export const priorityFeature: OutlinerFeature<PriorityFeatureContext> = {
	id: "priority",
	renderTrailing: (ctx) =>
		ctx.priority ? (
			<NodePriorityPill priority={ctx.priority} onChange={ctx.onSetPriority} />
		) : null,
	renderContextMenuItem: (ctx) => <PriorityMenuItem ctx={ctx} />,
};
