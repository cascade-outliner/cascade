import type { OutlinerFeature } from "../model/outliner-feature.types";
import { IconMenuItem } from "./components/icon-menu-item";
import { NodeIcon } from "./components/node-icon";

export interface IconFeatureContext {
	icon: string | null;
	onSetIcon: (icon: string | null) => void;
}

/**
 * Custom per-node emoji icon (#557). Rendered in its own leading slot,
 * separate from the row's focus dot (see `NodeLink`/`DefaultNodeLink`,
 * #589), plus the "Set/Change icon" context-menu submenu.
 */
export const iconFeature: OutlinerFeature<IconFeatureContext> = {
	id: "icon",
	renderLeading: (ctx) => (ctx.icon ? <NodeIcon icon={ctx.icon} /> : null),
	renderContextMenuItem: (ctx) => <IconMenuItem ctx={ctx} />,
};
