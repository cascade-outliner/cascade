import { plainText, relativeDay } from "@cascade/data";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { observer } from "mobx-react-lite";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: space["6"],
		marginBlock: space["8"],
	},
	group: {
		display: "flex",
		flexDirection: "column",
		gap: space["0.5"],
	},
	heading: {
		display: "flex",
		alignItems: "baseline",
		gap: space["2.5"],
		margin: 0,
		paddingInline: space["2.5"],
		paddingBottom: space["2"],
		marginBottom: space["1"],
		borderBottomWidth: borderWidth.thin,
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
		fontSize: fontSize["200"],
		fontWeight: 500,
		letterSpacing: "0.08em",
		textTransform: "uppercase",
		color: colors.muted,
	},
	count: {
		color: colors.placeholder,
	},
	item: {
		display: "flex",
		alignItems: "center",
		gap: space["2.5"],
		paddingBlock: space["1.5"],
		paddingInline: space["2.5"],
	},
	text: {
		flex: 1,
		minWidth: 0,
		color: colors.ink,
	},
	done: {
		color: colors.muted,
		textDecoration: "line-through",
	},
	from: {
		display: "flex",
		alignItems: "center",
		gap: space["1"],
		border: "none",
		paddingBlock: space["1"],
		paddingInline: space["1.5"],
		borderRadius: radius.sm,
		backgroundColor: {
			default: "transparent",
			":hover": colors.inkSubtle,
		},
		fontFamily: "inherit",
		fontSize: fontSize["200"],
		fontWeight: 500,
		color: colors.muted,
		whiteSpace: "nowrap",
		cursor: "pointer",
	},
});

export interface DueElsewhereProps {
	/** One section per day (`YYYY-MM-DD`); empty ones are left out. */
	groups: { label: string; day: string }[];
	/** Leaves out this node and its descendants: the note being viewed. */
	excluding: string;
	onZoomTo: (id: string | null) => void;
}

/** Nodes due on a day but written elsewhere in the outline, listed under a daily note. */
export const DueElsewhere = observer(function DueElsewhere({
	groups,
	excluding,
	onZoomTo,
}: DueElsewhereProps) {
	const store = useOutlineStore();
	const filled = groups
		.map((group) => ({
			...group,
			nodes: store.dueOn(group.day, { excluding }),
		}))
		.filter((group) => group.nodes.length > 0);

	if (filled.length === 0) {
		return null;
	}

	return (
		<div {...stylex.props(styles.root)}>
			{filled.map((group) => (
				<section
					key={group.day}
					aria-label={group.label}
					{...stylex.props(styles.group)}
				>
					<h2 {...stylex.props(styles.heading)}>
						{group.label}
						<span {...stylex.props(styles.count)}>{group.nodes.length}</span>
					</h2>
					{group.nodes.map((node) => {
						const parent = node.parentId ? store.get(node.parentId) : undefined;
						const done = !!node.task?.done;
						return (
							<div key={node.id} {...stylex.props(styles.item)}>
								{node.task && (
									<TaskMarker
										variant={done ? "done" : "todo"}
										aria-label={done ? "Mark as not done" : "Mark as done"}
										onClick={() => store.setTask(node.id, { done: !done })}
									/>
								)}
								<span {...stylex.props(styles.text, done && styles.done)}>
									{plainText(node.content)}
								</span>
								<button
									type="button"
									{...stylex.props(styles.from)}
									onClick={() => onZoomTo(node.parentId)}
								>
									{parent
										? (relativeDay(parent.id) ?? plainText(parent.content))
										: "Home"}
									<ArrowUpRightIcon size={11} />
								</button>
							</div>
						);
					})}
				</section>
			))}
		</div>
	);
});
