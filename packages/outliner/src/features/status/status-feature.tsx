import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { OutlinerFeature } from "../model/outliner-feature.types";
import { NodeStatusPill } from "./components/node-status-pill";
import { StatusMenuItem } from "./components/status-menu-item";

export interface StatusFeatureContext {
	status: StatusSummary | null;
	existingStatuses: StatusSummary[];
	onSetStatus: (statusId: string | null) => void;
	/** Creates a status and resolves to it, so the picker can select it
	 * immediately. Omit to hide inline creation. */
	onCreateStatus?: (name: string) => Promise<StatusSummary | null>;
	/** Deletes a status outright; nodes in it lose it but survive. */
	onDeleteStatus?: (id: string) => void | Promise<void>;
}

/** Custom statuses (#576): a trailing pill on rows that have one, plus a
 * "Set/Change status" context-menu submenu with inline creation. */
export const statusFeature: OutlinerFeature<StatusFeatureContext> = {
	id: "status",
	renderTrailing: (ctx) =>
		ctx.status ? (
			<NodeStatusPill
				status={ctx.status}
				existingStatuses={ctx.existingStatuses}
				onSelect={ctx.onSetStatus}
				onCreateStatus={ctx.onCreateStatus}
				onDeleteStatus={ctx.onDeleteStatus}
			/>
		) : null,
	renderContextMenuItem: (ctx) => <StatusMenuItem ctx={ctx} />,
};
