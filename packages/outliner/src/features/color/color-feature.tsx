import type { OutlinerFeature } from "../model/outliner-feature.types";
import { ColorMenuItem } from "./components/color-menu-item";

export interface ColorFeatureContext {
	color: string | null | undefined;
	onSetColor: (color: string | null) => void;
}

/**
 * Per-node color label (#656). Renders a "Set/Change color" context-menu
 * entry with a small fixed palette. The chosen color is applied as a
 * left-border tint on the row (see `VirtualTreeRow`).
 */
export const colorFeature: OutlinerFeature<ColorFeatureContext> = {
	id: "color",
	renderContextMenuItem: (ctx) => <ColorMenuItem ctx={ctx} />,
};
