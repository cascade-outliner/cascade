/**
 * Public aggregation module for immutable visible-row operations.
 * Implementations are split by responsibility to keep each algorithm focused.
 */
export {
	insertSubtreeAt,
	moveSubtree,
	moveWouldChangePosition,
} from "./move-subtree";
export type { MoveTarget } from "./move-targets";
export {
	captureCurrentPosition,
	findIndentTarget,
	findMoveDownTarget,
	findMoveUpTarget,
	findOutdentTarget,
} from "./move-targets";
export {
	appendRow,
	collapseNode,
	expandNode,
	insertRowAfter,
	insertSubtreeAfter,
	patchRow,
	removeSubtree,
} from "./row-mutations";
export {
	recomputeIsLastChild,
	siblingPosition,
	subtreeRange,
} from "./row-structure";
