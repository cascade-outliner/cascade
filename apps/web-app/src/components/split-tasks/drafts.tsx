import { dueLabel, isoDay } from "@cascade/data";
import { Pill } from "@cascade/ui/pill";
import type { SplitTask } from "#/server/split.ts";
import { css, keyframes } from "#/styled-system/css";
import type { SystemStyleObject } from "#/styled-system/types";

const rise = keyframes({
	from: { opacity: "hidden", transform: "translateY(4px)" },
	to: { opacity: "full", transform: "none" },
});

const styles = {
	// Grows from nothing when the drafts arrive.
	growIn: css({
		display: "grid",
		gridTemplateRows: "1fr",
		transitionProperty: "[grid-template-rows]",
		transitionDuration: { base: "250", _motionReduce: "0" },
		transitionTimingFunction: "out",
		_starting: {
			gridTemplateRows: "0fr",
		},
	}),
	clip: css({
		minHeight: "0",
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
		borderLeftColor: "primarySoft",
	}),
	// Each draft rises in after the one before it.
	draft: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		paddingBlock: "1.5",
		paddingInline: "2.5",
		color: "ink",
		animationName: { base: `[${rise}]` as const, _motionReduce: "[none]" },
		animationDuration: "250",
		animationTimingFunction: "out",
		animationFillMode: "backwards",
	}),
	marker: css({
		width: "control.xs",
		height: "control.xs",
		flexShrink: 0,
		borderRadius: "full",
		borderWidth: "thick",
		borderStyle: "dashed",
		borderColor: "primarySoft",
	}),
	text: css({
		flex: "1",
		minWidth: "0",
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
