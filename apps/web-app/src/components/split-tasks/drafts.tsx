import { dueLabel, isoDay } from "@cascade/data";
import { Pill } from "@cascade/ui/pill";
import type { SplitTask } from "#/server/split.ts";
import { css, keyframes } from "#/styled-system/css";
import type { SystemStyleObject } from "#/styled-system/types";

const dashed = "color-mix(in srgb, token(colors.primary) 55%, transparent)";

const rise = keyframes({
	from: { opacity: 0, transform: "translateY(4px)" },
	to: { opacity: 1, transform: "none" },
});

const styles = {
	// Grows from nothing when the drafts arrive.
	growIn: css({
		display: "grid",
		gridTemplateRows: "1fr",
		transition: {
			base: "grid-template-rows 260ms cubic-bezier(0.2, 0, 0, 1)",
			_motionReduce: "none",
		},
		_starting: {
			gridTemplateRows: "0fr",
		},
	}),
	clip: css({
		minHeight: 0,
		overflow: "hidden",
	}),
	list: css.raw({
		display: "flex",
		flexDirection: "column",
		gap: "px",
		marginLeft: "5",
		paddingLeft: "2.5",
		borderLeftWidth: "thin",
		borderLeftStyle: "dashed",
		borderLeftColor: dashed,
	}),
	// Each draft rises in after the one before it.
	draft: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		paddingBlock: "1.5",
		paddingInline: "2.5",
		color: "ink",
		animationName: { base: rise, _motionReduce: "none" },
		animationDuration: "240ms",
		animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
		animationFillMode: "backwards",
	}),
	marker: css({
		width: "18px",
		height: "18px",
		flexShrink: 0,
		borderRadius: "full",
		borderWidth: "thick",
		borderStyle: "dashed",
		borderColor: dashed,
	}),
	text: css({
		flex: 1,
		minWidth: 0,
	}),
};

function TaskChips({ task }: { task: SplitTask }) {
	return (
		<>
			{task.owner && <Pill>@{task.owner}</Pill>}
			{task.due && (
				<Pill tone={task.due <= isoDay(new Date()) ? "primary" : "info"}>
					{dueLabel(task.due)}
				</Pill>
			)}
		</>
	);
}

export interface DraftsProps {
	tasks: SplitTask[];
	css?: SystemStyleObject;
}

/** The dashed task list both views preview a split with. */
export function Drafts({ tasks, css: cssProp }: DraftsProps) {
	return (
		<div className={styles.growIn}>
			<div className={styles.clip}>
				<div className={css(styles.list, cssProp)}>
					{tasks.map((task, i) => (
						<div
							key={task.source}
							style={{ animationDelay: `${60 + i * 50}ms` }}
							className={styles.draft}
						>
							<span className={styles.marker} />
							<span className={styles.text}>{task.text}</span>
							<TaskChips task={task} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
