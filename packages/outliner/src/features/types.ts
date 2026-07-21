import type { ReactNode } from "react";

/**
 * A single outliner row/context-menu feature. `VirtualTree`'s `features`
 * prop takes a list of these instead of the tree row hardcoding each
 * feature's rendering inline.
 *
 * Each feature declares its own narrow context type for what its renderers
 * need (see `TaskFeatureContext`, `DueDateFeatureContext`,
 * `TagsFeatureContext`) rather than sharing one large context shape.
 * `TContext` defaults to `unknown` for storing/iterating a list of features
 * whose concrete context types differ — the render methods use method-
 * shorthand syntax so TypeScript checks them bivariantly, letting a feature
 * typed for its own narrow context still slot into an `OutlinerFeature[]`.
 */
export interface OutlinerFeature<TContext = unknown> {
	id: string;
	/** Rendered before the node editor (e.g. a task checkbox). */
	renderLeading?(ctx: TContext): ReactNode;
	/** Rendered after the node editor, alongside other trailing slots (e.g. a due-date pill). */
	renderTrailing?(ctx: TContext): ReactNode;
	/** Rendered as a submenu/item in the row's right-click menu, before the
	 * core "Convert into" / "Delete" entries. */
	renderContextMenuItem?(ctx: TContext): ReactNode;
}
