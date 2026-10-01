import { plainText, relativeDay } from "@cascade/data";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { observer } from "mobx-react-lite";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { css } from "#/styled-system/css";

const styles = {
	root: css({
		display: "flex",
		flexDirection: "column",
		gap: "6",
		marginBlock: "8",
	}),
	group: css({
		display: "flex",
		flexDirection: "column",
		gap: "0.5",
	}),
	heading: css({
		display: "flex",
		alignItems: "baseline",
		gap: "2.5",
		margin: 0,
		paddingInline: "2.5",
		paddingBottom: "2",
		marginBottom: "1",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "border",
		fontSize: "200",
		fontWeight: 500,
		letterSpacing: "0.08em",
		textTransform: "uppercase",
		color: "muted",
	}),
	count: css({
		color: "placeholder",
	}),
	item: css({
		display: "flex",
		alignItems: "center",
		gap: "2.5",
		paddingBlock: "1.5",
		paddingInline: "2.5",
	}),
	text: css.raw({
		flex: 1,
		minWidth: 0,
		color: "ink",
	}),
	done: css.raw({
		color: "muted",
		textDecoration: "line-through",
	}),
	from: css({
		display: "flex",
		alignItems: "center",
		gap: "1",
		border: "none",
		paddingBlock: "1",
		paddingInline: "1.5",
		borderRadius: "sm",
		backgroundColor: {
			base: "transparent",
			_hover: "inkSubtle",
		},
		fontFamily: "inherit",
		fontSize: "200",
		fontWeight: 500,
		color: "muted",
		whiteSpace: "nowrap",
		cursor: "pointer",
	}),
};

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
		<div className={styles.root}>
			{filled.map((group) => (
				<section
					key={group.day}
					aria-label={group.label}
					className={styles.group}
				>
					<h2 className={styles.heading}>
						{group.label}
						<span className={styles.count}>{group.nodes.length}</span>
					</h2>
					{group.nodes.map((node) => {
						const parent = node.parentId ? store.get(node.parentId) : undefined;
						const done = !!node.task?.done;
						return (
							<div key={node.id} className={styles.item}>
								{node.task && (
									<TaskMarker
										variant={done ? "done" : "todo"}
										aria-label={done ? "Mark as not done" : "Mark as done"}
										onClick={() => store.setTask(node.id, { done: !done })}
									/>
								)}
								<span className={css(styles.text, done && styles.done)}>
									{plainText(node.content)}
								</span>
								<button
									type="button"
									className={styles.from}
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
