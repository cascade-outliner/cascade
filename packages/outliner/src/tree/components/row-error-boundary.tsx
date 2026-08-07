import { Component, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import type { OutlinerLabels } from "../../i18n/outliner-labels-context";
import type { VisibleNodeRow } from "../../nodes/model/node-types";

interface RowErrorBoundaryProps {
	row: VisibleNodeRow;
	start: number;
	index: number;
	indentSize: number;
	measureElement: (element: HTMLDivElement | null) => void;
	labels: OutlinerLabels;
	onDelete: () => void | Promise<void>;
	children: ReactNode;
}

interface RowErrorBoundaryState {
	hasError: boolean;
}

/**
 * A single broken row (e.g. content that fails to render) would otherwise
 * throw past the route-level error boundary and crash the whole tree. This
 * isolates that failure to the one row, so the rest of the tree keeps
 * working and the user can delete the offending node instead of being
 * stuck behind a generic error screen.
 */
export class RowErrorBoundary extends Component<
	RowErrorBoundaryProps,
	RowErrorBoundaryState
> {
	state: RowErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): RowErrorBoundaryState {
		return { hasError: true };
	}

	render() {
		const { row, start, index, indentSize, measureElement, labels, onDelete } =
			this.props;

		if (!this.state.hasError) {
			return this.props.children;
		}

		return (
			<div
				ref={measureElement}
				data-index={index}
				role="treeitem"
				tabIndex={-1}
				aria-level={row.depth + 1}
				className="top-0 left-0 w-full absolute"
				style={{ transform: `translateY(${start}px)` }}
			>
				<div
					className="flex items-center gap-3 py-2"
					style={{ paddingLeft: row.depth * indentSize }}
				>
					<p className="text-sm opacity-70 flex-1">{labels.rowErrorMessage}</p>
					<button
						type="button"
						className={twMerge(
							"shrink-0 px-2 py-1 rounded border border-current text-xs",
						)}
						onClick={onDelete}
					>
						{labels.rowErrorDeleteAction}
					</button>
				</div>
			</div>
		);
	}
}
