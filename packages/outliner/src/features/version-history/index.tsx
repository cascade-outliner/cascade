import type { VisibleNodeRow } from "../../node-types";
import type { OutlinerFeature } from "../types";
import { VersionHistoryMenuItem } from "./version-history-menu-item";

export interface VersionHistoryFeatureContext {
	row: Pick<VisibleNodeRow, "id">;
	onOpenVersionHistory?: (nodeId: string) => void;
}

/** Version history: a context-menu item that opens a modal listing a
 * node's prior content versions. Hidden when `onOpenVersionHistory` isn't
 * supplied by the consumer. */
export const versionHistoryFeature: OutlinerFeature<VersionHistoryFeatureContext> =
	{
		id: "version-history",
		renderContextMenuItem: (ctx) => <VersionHistoryMenuItem ctx={ctx} />,
	};
