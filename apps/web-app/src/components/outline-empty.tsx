import { space } from "@cascade/theme/tokens.stylex";
import { EmptyStateCard as Card } from "@cascade/ui/empty-state-card";
import {
	CursorClickIcon,
	LinkBreakIcon,
	ListDashesIcon,
	MagnifyingGlassPlusIcon,
	TreeStructureIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
		gap: space["3.5"],
	},
});

export function NodeNotFound() {
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
			<Card.Action>Back to the outline</Card.Action>
		</Card.Root>
	);
}

export interface OutlineEmptyProps {
	/** Zoomed into a node with no children, rather than an empty outline. */
	zoomed: boolean;
}

export function OutlineEmpty({ zoomed }: OutlineEmptyProps) {
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
				<Card.Action>
					Add a step <Card.Shortcut>↵</Card.Shortcut>
				</Card.Action>
			</Card.Root>
		);
	}

	return (
		<div {...stylex.props(styles.grid)}>
			<Card.Root>
				<Card.Icon>
					<ListDashesIcon />
				</Card.Icon>
				<Card.Title>Nothing here yet</Card.Title>
				<Card.Description>
					Start typing to make the first node. Press Tab to nest it under
					another.
				</Card.Description>
				<Card.Action>
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
