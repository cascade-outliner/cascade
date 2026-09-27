import { dueLabel, isoDay } from "@cascade/data";
import {
	borderWidth,
	colors,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { Pill } from "@cascade/ui/pill";
import * as stylex from "@stylexjs/stylex";
import type { SplitTask } from "#/server/split.ts";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";
const dashed = `color-mix(in srgb, ${colors.primary} 55%, transparent)`;

const rise = stylex.keyframes({
	from: { opacity: 0, transform: "translateY(4px)" },
	to: { opacity: 1, transform: "none" },
});

const styles = stylex.create({
	// Grows from nothing when the drafts arrive.
	growIn: {
		display: "grid",
		gridTemplateRows: "1fr",
		transition: {
			default: "grid-template-rows 260ms cubic-bezier(0.2, 0, 0, 1)",
			[REDUCED_MOTION]: "none",
		},
		"@starting-style": {
			gridTemplateRows: "0fr",
		},
	},
	clip: {
		minHeight: 0,
		overflow: "hidden",
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: space.px,
		marginLeft: space["5"],
		paddingLeft: space["2.5"],
		borderLeftWidth: borderWidth.thin,
		borderLeftStyle: "dashed",
		borderLeftColor: dashed,
	},
	// Each draft rises in after the one before it.
	draft: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		paddingBlock: space["1.5"],
		paddingInline: space["2.5"],
		color: colors.ink,
		animationName: { default: rise, [REDUCED_MOTION]: "none" },
		animationDuration: "240ms",
		animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
		animationFillMode: "backwards",
	},
	marker: {
		width: 18,
		height: 18,
		flexShrink: 0,
		borderRadius: radius.full,
		borderWidth: borderWidth.thick,
		borderStyle: "dashed",
		borderColor: dashed,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
});

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
	style?: stylex.StyleXStyles;
}

/** The dashed task list both views preview a split with. */
export function Drafts({ tasks, style }: DraftsProps) {
	return (
		<div {...stylex.props(styles.growIn)}>
			<div {...stylex.props(styles.clip)}>
				<div {...stylex.props(styles.list, style)}>
					{tasks.map((task, i) => (
						<div
							key={task.source}
							style={{ animationDelay: `${60 + i * 50}ms` }}
							{...stylex.props(styles.draft)}
						>
							<span {...stylex.props(styles.marker)} />
							<span {...stylex.props(styles.text)}>{task.text}</span>
							<TaskChips task={task} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
