import {
	isoDay,
	type Node,
	type Summary,
	type SummaryMode,
	type SummaryStatus,
} from "@cascade/data";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	space,
} from "@cascade/theme/tokens.stylex";
import { SparkleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { observer } from "mobx-react-lite";
import { Fragment, useRef, useState } from "react";
import {
	branchBasis,
	lineText,
	readBranch,
	toSummary,
} from "#/components/summary/branch.ts";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { summarizeBranch } from "#/server/summarize.ts";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";
const dashed = `color-mix(in srgb, ${colors.primary} 35%, transparent)`;

const MODES: { mode: SummaryMode; label: string }[] = [
	{ mode: "line", label: "One line" },
	{ mode: "short", label: "Short" },
	{ mode: "status", label: "Status" },
];

const STATUSES: { status: SummaryStatus; label: string }[] = [
	{ status: "done", label: "Done" },
	{ status: "progress", label: "In progress" },
	{ status: "blocked", label: "Blocked" },
];

const pulse = stylex.keyframes({
	"0%, 100%": { opacity: 0.5 },
	"50%": { opacity: 1 },
});

const styles = stylex.create({
	trigger: {
		display: "inline-flex",
		alignItems: "center",
		gap: space["1.5"],
		marginTop: space["2"],
		padding: 0,
		border: "none",
		backgroundColor: "transparent",
		fontSize: fontSize["200"],
		fontWeight: 500,
		color: { default: colors.muted, ":hover": colors.primary },
		cursor: "pointer",
	},
	card: {
		display: "flex",
		flexDirection: "column",
		gap: space["3"],
		marginTop: space["4"],
		paddingBlock: space["3.5"],
		paddingInline: space["4"],
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "dashed",
		borderColor: dashed,
		backgroundColor: `color-mix(in srgb, ${colors.primary} 4%, transparent)`,
	},
	pinned: {
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
	},
	head: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: space["2.5"],
	},
	label: {
		display: "flex",
		alignItems: "center",
		gap: space["1.5"],
		flex: 1,
		minWidth: 0,
		fontSize: fontSize["200"],
		fontWeight: 600,
		color: colors.primary,
		whiteSpace: "nowrap",
	},
	stale: {
		paddingBlock: "1px",
		paddingInline: space["1.5"],
		borderRadius: radius.sm,
		backgroundColor: colors.inkSubtle,
		color: colors.muted,
	},
	modes: {
		display: "flex",
		margin: 0,
		minWidth: 0,
		border: "none",
		gap: space["0.5"],
		padding: space["0.5"],
		borderRadius: "7px",
		backgroundColor: colors.inkSubtle,
	},
	mode: {
		paddingBlock: "3px",
		paddingInline: space["2"],
		border: "none",
		borderRadius: "5px",
		backgroundColor: "transparent",
		font: "inherit",
		fontSize: fontSize["200"],
		color: { default: colors.muted, ":hover": colors.ink },
		cursor: "pointer",
	},
	modeOn: {
		backgroundColor: colors.canvas,
		boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
		color: colors.ink,
	},
	prose: {
		margin: 0,
		fontSize: fontSize["300"],
		lineHeight: 1.65,
		color: colors.ink,
		textWrap: "pretty",
	},
	loading: {
		display: "flex",
		flexDirection: "column",
		gap: space["2"],
		paddingBlock: space["1"],
	},
	bar: {
		height: 10,
		borderRadius: radius.sm,
		backgroundColor: colors.inkSubtle,
		animationName: { default: pulse, [REDUCED_MOTION]: "none" },
		animationDuration: "1.4s",
		animationIterationCount: "infinite",
	},
	error: {
		margin: 0,
		fontSize: fontSize["300"],
		color: colors.muted,
	},
	groups: {
		display: "flex",
		flexDirection: "column",
		gap: space["2.5"],
	},
	groupLabel: {
		fontSize: fontSize["200"],
		fontWeight: 600,
		color: colors.muted,
	},
	list: {
		margin: 0,
		marginTop: space["1"],
		paddingLeft: space["4"],
	},
	cite: {
		padding: 0,
		marginLeft: "2px",
		border: "none",
		backgroundColor: "transparent",
		fontSize: fontSize["100"],
		fontWeight: 500,
		lineHeight: 1,
		verticalAlign: "super",
		color: colors.primary,
		cursor: "pointer",
	},
	chips: {
		display: "flex",
		flexWrap: "wrap",
		gap: space["1.5"],
	},
	chip: {
		display: "flex",
		alignItems: "center",
		gap: "5px",
		maxWidth: "100%",
		paddingBlock: "3px",
		paddingInline: space["2"],
		border: "none",
		borderRadius: "6px",
		backgroundColor: { default: colors.canvas, ":hover": colors.surface },
		boxShadow: `0 0 0 1px ${colors.border}`,
		font: "inherit",
		fontSize: fontSize["200"],
		color: colors.ink,
		cursor: { default: "pointer", ":disabled": "default" },
	},
	chipText: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	chipNumber: {
		fontSize: fontSize["100"],
		fontWeight: 500,
		color: colors.primary,
	},
	actions: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: space["3.5"],
	},
	action: {
		padding: 0,
		border: "none",
		backgroundColor: "transparent",
		fontSize: fontSize["200"],
		fontWeight: 500,
		color: { default: colors.muted, ":hover": colors.ink },
		cursor: "pointer",
	},
	actionPrimary: {
		color: { default: colors.primary, ":hover": colors.primary },
	},
});

type Draft =
	| { mode: SummaryMode; state: "loading" }
	| { mode: SummaryMode; state: "ready"; summary: Summary }
	| { mode: SummaryMode; state: "error" };

function Cites({
	sources,
	summary,
	onZoomTo,
}: {
	sources: number[];
	summary: Summary;
	onZoomTo: (id: string) => void;
}) {
	return sources.map((n) => (
		<button
			key={n}
			type="button"
			aria-label={`Source ${n}`}
			onClick={() => summary.sources[n - 1] && onZoomTo(summary.sources[n - 1])}
			{...stylex.props(styles.cite)}
		>
			{n}
		</button>
	));
}

function Body({
	summary,
	onZoomTo,
}: {
	summary: Summary;
	onZoomTo: (id: string) => void;
}) {
	if (summary.mode !== "status") {
		return (
			<p {...stylex.props(styles.prose)} data-testid="summary-text">
				{summary.sentences.map((sentence, i) => (
					<Fragment key={sentence.text}>
						{i > 0 && " "}
						{sentence.text}
						<Cites
							sources={sentence.sources}
							summary={summary}
							onZoomTo={onZoomTo}
						/>
					</Fragment>
				))}
			</p>
		);
	}
	return (
		<div {...stylex.props(styles.groups)} data-testid="summary-text">
			{STATUSES.map(({ status, label }) => {
				const items = summary.sentences.filter((s) => s.status === status);
				if (items.length === 0) return null;
				return (
					<div key={status}>
						<div {...stylex.props(styles.groupLabel)}>{label}</div>
						<ul {...stylex.props(styles.list, styles.prose)}>
							{items.map((item) => (
								<li key={item.text}>
									{item.text}
									<Cites
										sources={item.sources}
										summary={summary}
										onZoomTo={onZoomTo}
									/>
								</li>
							))}
						</ul>
					</div>
				);
			})}
		</div>
	);
}

export interface SummaryCardProps {
	/** The zoomed-in node whose branch is summarized. */
	node: Node;
	/** Unset when AI is off: a pinned summary still shows, but can't be redone. */
	ai: boolean;
	onZoomTo: (id: string) => void;
}

/**
 * 5b: a summary of the zoomed branch, under its title. It stays dashed until
 * pinned to the node; a pinned one is marked out of date once the branch changes.
 */
export const SummaryCard = observer(function SummaryCard({
	node,
	ai,
	onZoomTo,
}: SummaryCardProps) {
	const store = useOutlineStore();
	const [draft, setDraft] = useState<Draft | null>(null);
	const request = useRef(0);
	const cache = useRef(new Map<string, Summary>());

	const lines = store.subtree(node.id);
	const branches = lines.filter((row) => row.depth === 0).length;
	const pinned = node.summary;

	function summarize(mode: SummaryMode, fresh = false) {
		const branch = readBranch(store, node);
		const key = `${mode}:${branch.basis}`;
		const cached = cache.current.get(key);
		if (cached && !fresh) {
			setDraft({ mode, state: "ready", summary: cached });
			return;
		}
		const id = ++request.current;
		setDraft({ mode, state: "loading" });
		summarizeBranch({
			data: {
				outline: branch.outline,
				mode,
				branches: branch.children.length,
				today: isoDay(new Date()),
			},
		})
			.then((result) => {
				const summary = toSummary(result, branch, mode);
				cache.current.set(key, summary);
				if (id === request.current) {
					setDraft({ mode, state: "ready", summary });
				}
			})
			.catch((error) => {
				console.error("Summary: request failed", error);
				if (id === request.current) setDraft({ mode, state: "error" });
			});
	}

	if (!pinned && !draft) {
		if (!ai || lines.length === 0) return null;
		return (
			<button
				type="button"
				data-testid="summarize"
				onClick={() => summarize("short")}
				{...stylex.props(styles.trigger)}
			>
				<SparkleIcon size={12} aria-hidden />
				Summarize this branch
			</button>
		);
	}

	const discard = () => {
		request.current++;
		setDraft(null);
	};

	const shown =
		draft?.state === "ready" ? draft.summary : draft ? null : pinned;
	const mode = draft?.mode ?? pinned?.mode ?? "short";
	const stale =
		!draft && !!pinned && pinned.basis !== branchBasis(store, node.id);

	return (
		<section
			aria-label="Summary"
			aria-busy={draft?.state === "loading"}
			data-testid="summary"
			data-state={draft ? draft.state : stale ? "stale" : "pinned"}
			{...stylex.props(styles.card, !draft && styles.pinned)}
		>
			<div {...stylex.props(styles.head)}>
				<span {...stylex.props(styles.label)}>
					<SparkleIcon size={12} aria-hidden />
					Summary · {branches} {branches === 1 ? "branch" : "branches"},{" "}
					{lines.length} {lines.length === 1 ? "line" : "lines"}
					{stale && <span {...stylex.props(styles.stale)}>Out of date</span>}
				</span>
				{ai && (
					<fieldset aria-label="Length" {...stylex.props(styles.modes)}>
						{MODES.map((each) => (
							<button
								key={each.mode}
								type="button"
								aria-pressed={each.mode === mode}
								onClick={() => each.mode !== mode && summarize(each.mode)}
								{...stylex.props(
									styles.mode,
									each.mode === mode && styles.modeOn,
								)}
							>
								{each.label}
							</button>
						))}
					</fieldset>
				)}
			</div>

			{draft?.state === "loading" && (
				<div {...stylex.props(styles.loading)}>
					<span {...stylex.props(styles.bar)} style={{ width: "92%" }} />
					{mode !== "line" && (
						<>
							<span {...stylex.props(styles.bar)} style={{ width: "78%" }} />
							<span {...stylex.props(styles.bar)} style={{ width: "54%" }} />
						</>
					)}
				</div>
			)}
			{draft?.state === "error" && (
				<p {...stylex.props(styles.error)}>
					Couldn't summarize this branch right now.
				</p>
			)}
			{shown && shown.sentences.length === 0 && (
				<p {...stylex.props(styles.error)}>
					{shown.mode === "status"
						? "No tasks in this branch yet."
						: "Nothing here to summarize yet."}
				</p>
			)}
			{shown && <Body summary={shown} onZoomTo={onZoomTo} />}
			{shown && shown.sources.length > 0 && (
				<div {...stylex.props(styles.chips)}>
					{shown.sources.map((id, i) => {
						const source = store.get(id);
						return (
							<button
								key={id}
								type="button"
								disabled={!source}
								onClick={() => onZoomTo(id)}
								{...stylex.props(styles.chip)}
							>
								<span {...stylex.props(styles.chipNumber)}>{i + 1}</span>
								<span {...stylex.props(styles.chipText)}>
									{source ? lineText(source) : "Deleted line"}
								</span>
							</button>
						);
					})}
				</div>
			)}

			<div {...stylex.props(styles.actions)}>
				{draft ? (
					<>
						{draft.state === "ready" && (
							<button
								type="button"
								onClick={() => {
									store.setSummary(node.id, draft.summary);
									setDraft(null);
								}}
								{...stylex.props(styles.action, styles.actionPrimary)}
							>
								Pin to page
							</button>
						)}
						{draft.state !== "loading" && (
							<button
								type="button"
								onClick={() => summarize(draft.mode, true)}
								{...stylex.props(styles.action)}
							>
								Redo
							</button>
						)}
						<button
							type="button"
							onClick={discard}
							{...stylex.props(styles.action)}
						>
							Discard
						</button>
					</>
				) : (
					<>
						{ai && (
							<button
								type="button"
								onClick={() => summarize(mode, true)}
								{...stylex.props(styles.action, stale && styles.actionPrimary)}
							>
								Refresh
							</button>
						)}
						<button
							type="button"
							onClick={() => store.setSummary(node.id, null)}
							{...stylex.props(styles.action)}
						>
							Unpin
						</button>
					</>
				)}
			</div>
		</section>
	);
});
