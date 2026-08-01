import type { OutlinerFeature } from "../model/outliner-feature.types";
import { IconMenuItem } from "./components/icon-menu-item";

export interface IconFeatureContext {
	icon: string | null;
	onSetIcon: (icon: string | null) => void;
}

/**
 * Custom per-node emoji icon (#557). Rendered as the row's focus circle
 * itself (see `NodeLink`/`DefaultNodeLink`) rather than a slot here — this
 * feature only contributes the "Set/Change icon" context-menu submenu.
 */
export const iconFeature: OutlinerFeature<IconFeatureContext> = {
	id: "icon",
	renderContextMenuItem: (ctx) => <IconMenuItem ctx={ctx} />,
};
