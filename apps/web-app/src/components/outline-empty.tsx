import { EmptyStateCard as Card } from "@cascade/ui/empty-state-card";
import {
	CursorClickIcon,
	LinkBreakIcon,
	ListDashesIcon,
	MagnifyingGlassPlusIcon,
	TreeStructureIcon,
} from "@phosphor-icons/react";
import { css } from "#/styled-system/css";

const styles = {
	grid: css({
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
		gap: "3.5",
	}),
};

export interface NodeNotFoundProps {
	/** Navigates back to the top-level outline. */
	onBack: () => void;
}

export function NodeNotFound({ onBack }: NodeNotFoundProps) {
	return (
		<Card.Root>
			<Card.Icon>
				<LinkBreakIcon />
			</Card.Icon>
			<Card.Title>Node not found</Card.Title>
			<Card.Description>
				This node was deleted or the link is out of date. Its children, if it
				had any, went with it.
			</Card.Description>
			<Card.Action onClick={onBack}>Back to the outline</Card.Action>
		</Card.Root>
	);
}

export interface OutlineEmptyProps {
	/** Zoomed into a node with no children, rather than an empty outline. */
	zoomed: boolean;
	/** Focuses the capture bar so the user can start typing. */
	onAddStep: () => void;
}

export function OutlineEmpty({ zoomed, onAddStep }: OutlineEmptyProps) {
	if (zoomed) {
		return (
			<Card.Root>
				<Card.Icon>
					<MagnifyingGlassPlusIcon />
				</Card.Icon>
				<Card.Title>No children</Card.Title>
				<Card.Description>
					You have zoomed into a node with nothing inside it. Add steps, or zoom
					back out.
				</Card.Description>
				<Card.Action onClick={onAddStep}>
					Add a step <Card.Shortcut>↵</Card.Shortcut>
				</Card.Action>
			</Card.Root>
		);
	}

	return (
		<div className={styles.grid} data-testid="outline-empty">
			<Card.Root>
				<Card.Icon>
					<ListDashesIcon />
				</Card.Icon>
				<Card.Title>Nothing here yet</Card.Title>
				<Card.Description>
					Start typing to make the first node. Press Tab to nest it under
					another.
				</Card.Description>
				<Card.Action onClick={onAddStep}>
					Write the first line <Card.Shortcut>↵</Card.Shortcut>
				</Card.Action>
			</Card.Root>
			<Card.Root>
				<Card.Icon>
					<TreeStructureIcon />
				</Card.Icon>
				<Card.Title>Zoom into anything</Card.Title>
				<Card.Description>
					Click a bullet to open that node as its own page. The breadcrumb takes
					you back out.
				</Card.Description>
			</Card.Root>
			<Card.Root>
				<Card.Icon>
					<CursorClickIcon />
				</Card.Icon>
				<Card.Title>Right-click for more</Card.Title>
				<Card.Description>
					Turn a node into a task, duplicate it, move it or delete it from its
					menu.
				</Card.Description>
			</Card.Root>
		</div>
	);
}
