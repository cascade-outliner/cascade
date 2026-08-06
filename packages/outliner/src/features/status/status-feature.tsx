import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { OutlinerFeature } from "../model/outliner-feature.types";
import { NodeStatusPill } from "./components/node-status-pill";
import { StatusMenuItem } from "./components/status-menu-item";

export interface StatusFeatureContext {
	status: StatusSummary | null;
	existingStatuses: StatusSummary[];
	onSetStatus: (statusId: string | null) => void;
}

/** Custom statuses (#576): a trailing pill on rows that have one, plus a
 * "Set/Change status" context-menu submenu that picks from the statuses
 * managed in Settings. */
export const statusFeature: OutlinerFeature<StatusFeatureContext> = {
	id: "status",
	renderTrailing: (ctx) =>
		ctx.status ? (
			<NodeStatusPill
				status={ctx.status}
				existingStatuses={ctx.existingStatuses}
				onSelect={ctx.onSetStatus}
			/>
		) : null,
	renderContextMenuItem: (ctx) => <StatusMenuItem ctx={ctx} />,
};
