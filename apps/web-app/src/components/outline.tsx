import {
	dayId,
	dueLabel,
	isoDay,
	type Node,
	plainText,
	type Row,
	relativeDay,
	shiftDay,
	textState,
} from "@cascade/data";
import { space } from "@cascade/theme/tokens.stylex";
import { CaptureBar } from "@cascade/ui/capture-bar";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { Chevron } from "@cascade/ui/outliner/chevron";
import { Content } from "@cascade/ui/outliner/content";
import { Row as RowShell } from "@cascade/ui/outliner/row";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import { ZoomHeader } from "@cascade/ui/outliner/zoom-header";
import { Pill } from "@cascade/ui/pill";
import * as stylex from "@stylexjs/stylex";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "#/components/app-header.tsx";
import { DueElsewhere } from "#/components/due-elsewhere.tsx";
import { isOnboarded, Onboarding } from "#/components/onboarding.tsx";
import { NodeNotFound, OutlineEmpty } from "#/components/outline-empty.tsx";
import { OutlinerContextMenu } from "#/components/outliner-context-menu.tsx";
import { useCaptureSlashCommands } from "#/components/slash-commands/capture.ts";
import { SlashCommandsPlugin } from "#/components/slash-commands/slash-commands-plugin.tsx";
import { CaptureSplit } from "#/components/split-tasks/capture-split.tsx";
import { Marked } from "#/components/split-tasks/marked.tsx";
import { SplitSheet } from "#/components/split-tasks/split-sheet.tsx";
import { useOutlineStore, useSync } from "#/lib/outline-store.tsx";

const appRoute = getRouteApi("/_app");

const styles = stylex.create({
	page: {
		maxWidth: 980,
		margin: "0 auto",
		padding: { default: space["8"], "@media (max-width: 640px)": space["4"] },
	},
	outline: {
		display: "flex",
		flexDirection: "column",
		gap: space["1"],
	},
	zoomHeader: {
		marginBottom: space["6"],
	},
	// Keeps the capture bar in reach at the bottom of long outlines.
	captureBar: {
		position: "sticky",
		bottom: `max(${space["4"]}, env(safe-area-inset-bottom))`,
		zIndex: 1,
		viewTransitionName: "capture-bar",
	},
});

function zoomTransitionName(id: string): string {
	return `outline-node-${id}`;
}

interface OutlineRowProps {
	row: Row;
	active: boolean;
	onOpenChange: (open: boolean) => void;
	onZoomTo: (id: string | null) => void;
	/** Opens the split sheet (3b). Unset when AI is off (no API key on the server). */
	onSplit?: (split: Split) => void;
	/** Phrases to highlight while this row is being split, read-only. */
	highlight?: string[];
}

/** A note being split in the review sheet (3b). */
interface Split {
	id: string;
	/** The note's text when asked, so highlights line up with it. */
	text: string;
}

/** One row. Its own observer, so a task or collapse toggle re-renders only this row. */
const OutlineRow = observer(function OutlineRow({
	row: { node, childCount },
	active,
	onOpenChange,
	onZoomTo,
	onSplit,
	highlight,
}: OutlineRowProps) {
	const store = useOutlineStore();
	const split =
		onSplit && ((id: string) => onSplit({ id, text: plainText(node.content) }));

	return (
		<OutlinerContextMenu
			node={node}
			childCount={childCount}
			onOpenChange={onOpenChange}
			onZoomIn={onZoomTo}
			onSplit={split}
		>
			<RowShell
				active={active || !!highlight}
				selected={store.selection.has(node.id)}
				style={{ viewTransitionName: zoomTransitionName(node.id) }}
			>
				<Chevron
					open={!node.collapsed}
					hidden={childCount === 0}
					onClick={() => store.setCollapsed(node.id, !node.collapsed)}
				/>
				<Bullet
					collapsed={node.collapsed && childCount > 0}
					onClick={() => onZoomTo(node.id)}
				/>
				{node.task && (
					<TaskMarker
						variant={node.task.done ? "done" : "todo"}
						onClick={() => store.setTask(node.id, { done: !node.task?.done })}
					/>
				)}
				<Content
					label={
						highlight ? (
							<Marked text={plainText(node.content)} phrases={highlight} />
						) : (
							(relativeDay(node.id) ?? undefined)
						)
					}
					editable={!store.isLocked(node.id)}
					onChange={(state) => store.setContent(node.id, state.toJSON())}
				>
					<SlashCommandsPlugin
						node={node}
						childCount={childCount}
						onZoomTo={onZoomTo}
						onSplit={split}
					/>
				</Content>
				{node.due && (
					<Pill
						tone={node.due <= isoDay(new Date()) ? "primary" : "info"}
						data-testid="due-pill"
					>
						{dueLabel(node.due)}
					</Pill>
				)}
			</RowShell>
		</OutlinerContextMenu>
	);
});

export interface OutlineProps {
	/** The node to zoom into, or `null` to show the top-level outline. */
	zoomedId: string | null;
}

export const Outline = observer(function Outline({ zoomedId }: OutlineProps) {
	const store = useOutlineStore();
	const sync = useSync();
	const navigate = useNavigate();
	const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
	const [split, setSplit] = useState<Split | null>(null);
	const [sources, setSources] = useState<string[]>([]);
	const [captured, setCaptured] = useState<string | null>(null);
	const { aiEnabled } = appRoute.useLoaderData();
	const [onboarded, setOnboarded] = useState(isOnboarded);
	const captureInputRef = useRef<HTMLInputElement>(null);

	const zoomTo = (id: string | null) => {
		navigate({
			to: id ? "/node/$id" : "/",
			params: id ? { id } : undefined,
			viewTransition: true,
		});
	};
	const captureSlashMenu = useCaptureSlashCommands(zoomedId, zoomTo);

	// Zooming changes which rows are visible; a hidden selection would surprise on Backspace.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs on every zoom change on purpose
	useEffect(() => store.clearSelection(), [store, zoomedId]);

	// Backspace/Delete removes the selection, unless the user is typing somewhere. Esc clears it.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// A popup that took the key (a menu closing on Esc) keeps the selection.
			if (store.selection.size === 0 || event.defaultPrevented) {
				return;
			}
			if (event.key === "Escape") {
				store.clearSelection();
				return;
			}
			if (event.key !== "Backspace" && event.key !== "Delete") {
				return;
			}
			const active = document.activeElement;
			if (
				active instanceof HTMLElement &&
				(active.isContentEditable ||
					active instanceof HTMLInputElement ||
					active instanceof HTMLTextAreaElement)
			) {
				return;
			}
			event.preventDefault();
			store.removeMany(store.selection);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [store]);

	if (store.status !== "ready") {
		return null;
	}

	const zoomed = zoomedId ? store.get(zoomedId) : undefined;
	const rows = store.rows(zoomedId);

	if (!onboarded && store.size === 0) {
		return (
			<Onboarding
				onDone={() => {
					void sync.recordOnboarding();
					setOnboarded(true);
				}}
			/>
		);
	}

	const header = <AppHeader zoomedId={zoomedId} onZoomTo={zoomTo} />;

	if (zoomedId && !zoomed) {
		return (
			<>
				{header}
				<div {...stylex.props(styles.page)}>
					<NodeNotFound onBack={() => zoomTo(null)} />
				</div>
			</>
		);
	}

	return (
		<>
			{header}
			<div {...stylex.props(styles.page)}>
				{zoomed && (
					<div {...stylex.props(styles.zoomHeader)}>
						<ZoomHeader
							node={zoomed}
							readOnly={store.isLocked(zoomed.id)}
							labelOf={(node) => relativeDay(node.id) ?? undefined}
							onChange={(state) => store.setContent(zoomed.id, state.toJSON())}
							titleTransitionName={zoomTransitionName(zoomed.id)}
						/>
					</div>
				)}
				{rows.length === 0 && (
					<OutlineEmpty
						zoomed={!!zoomed}
						onAddStep={() => captureInputRef.current?.focus()}
					/>
				)}
				<VirtualList
					rows={rows}
					rootId={zoomedId}
					aria-label="Outline"
					onMove={(id, parentId, index) => store.move(id, parentId, index)}
					selected={store.selection}
					onSelect={store.select}
				>
					{(row) => (
						<OutlineRow
							row={row}
							active={menuOpenId === row.node.id}
							onOpenChange={(open) => setMenuOpenId(open ? row.node.id : null)}
							onZoomTo={zoomTo}
							onSplit={aiEnabled ? setSplit : undefined}
							highlight={split?.id === row.node.id ? sources : undefined}
						/>
					)}
				</VirtualList>
				{zoomedId === dayId(new Date()) && (
					<DueElsewhere
						groups={[
							{
								label: "Due today, elsewhere",
								day: isoDay(new Date()),
							},
							{ label: "Tomorrow", day: isoDay(shiftDay(null, 1)) },
						]}
						excluding={zoomedId}
						onZoomTo={zoomTo}
					/>
				)}
				{split && store.get(split.id) && (
					<SplitSheet
						key={split.id}
						node={store.get(split.id) as Node}
						text={split.text}
						onSources={setSources}
						onClose={() => {
							setSplit(null);
							setSources([]);
						}}
					/>
				)}
				<div {...stylex.props(styles.captureBar)}>
					<CaptureBar
						ref={captureInputRef}
						slashMenu={captureSlashMenu}
						onSplit={aiEnabled ? setCaptured : undefined}
						panel={
							captured !== null && (
								<CaptureSplit
									key={captured}
									text={captured}
									parentId={zoomedId}
									onClose={() => {
										setCaptured(null);
										captureInputRef.current?.focus();
									}}
								/>
							)
						}
						onSubmit={(text) => {
							store.create(zoomedId, {
								content: textState(text),
							});
						}}
					/>
				</div>
			</div>
		</>
	);
});
