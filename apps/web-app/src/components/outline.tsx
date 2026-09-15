import { type Row, textState } from "@cascade/data";
import { space } from "@cascade/theme/tokens.stylex";
import { CaptureBar } from "@cascade/ui/capture-bar";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { Chevron } from "@cascade/ui/outliner/chevron";
import { Content } from "@cascade/ui/outliner/content";
import { Row as RowShell } from "@cascade/ui/outliner/row";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import { ZoomHeader } from "@cascade/ui/outliner/zoom-header";
import * as stylex from "@stylexjs/stylex";
import { useNavigate } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { OutlinerContextMenu } from "#/components/outliner-context-menu.tsx";
import { useOutlineStore } from "#/lib/outline-store.tsx";

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
});

function zoomTransitionName(id: string): string {
	return `outline-node-${id}`;
}

interface OutlineRowProps {
	row: Row;
	active: boolean;
	onOpenChange: (open: boolean) => void;
	onZoomTo: (id: string | null) => void;
}

/** One row. Its own observer, so a task or collapse toggle re-renders only this row. */
const OutlineRow = observer(function OutlineRow({
	row: { node, childCount },
	active,
	onOpenChange,
	onZoomTo,
}: OutlineRowProps) {
	const store = useOutlineStore();

	return (
		<OutlinerContextMenu
			node={node}
			childCount={childCount}
			onOpenChange={onOpenChange}
			onZoomIn={onZoomTo}
		>
			<RowShell
				active={active}
				viewTransitionName={zoomTransitionName(node.id)}
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
					onChange={(state) => store.setContent(node.id, state.toJSON())}
				/>
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
	const navigate = useNavigate();
	const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

	const zoomTo = (id: string | null) => {
		navigate({
			to: id ? "/node/$id" : "/",
			params: id ? { id } : undefined,
			viewTransition: true,
		});
	};

	if (store.status !== "ready") {
		return null;
	}

	const zoomed = zoomedId ? store.get(zoomedId) : undefined;
	const rows = store.rows(zoomedId);

	return (
		<div {...stylex.props(styles.page)}>
			{zoomed && (
				<div
					{...stylex.props(styles.zoomHeader)}
					style={{
						viewTransitionName: zoomTransitionName(zoomed.id),
					}}
				>
					<ZoomHeader
						node={zoomed}
						parentId={store.parentOf(zoomed.id)}
						onZoomTo={zoomTo}
						onChange={(state) => store.setContent(zoomed.id, state.toJSON())}
					/>
				</div>
			)}
			<VirtualList
				rows={rows}
				rootId={zoomedId}
				onMove={(id, parentId, index) => store.move(id, parentId, index)}
			>
				{(row) => (
					<OutlineRow
						row={row}
						active={menuOpenId === row.node.id}
						onOpenChange={(open) => setMenuOpenId(open ? row.node.id : null)}
						onZoomTo={zoomTo}
					/>
				)}
			</VirtualList>
			<div style={{ viewTransitionName: "capture-bar" }}>
				<CaptureBar
					onSubmit={(text) => {
						const id = store.create(zoomedId);
						store.setContent(id, textState(text));
					}}
				/>
			</div>
		</div>
	);
});
