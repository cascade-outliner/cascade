import { textState } from "@cascade/data";
import { CaptureBar } from "@cascade/ui/capture-bar";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { Content } from "@cascade/ui/outliner/content";
import { DragHandle } from "@cascade/ui/outliner/drag-handle";
import { Row } from "@cascade/ui/outliner/row";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import { ZoomHeader } from "@cascade/ui/outliner/zoom-header";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { flushSync } from "react-dom";
import { DevSeedToolbar } from "#/components/dev-seed-toolbar.tsx";
import { OutlinerContextMenu } from "#/components/outliner-context-menu.tsx";
import { OutlineStoreProvider, useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	page: {
		maxWidth: 980,
		margin: "0 auto",
		padding: { default: 32, "@media (max-width: 640px)": 16 },
	},
	outline: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
	},
	zoomHeader: {
		marginBottom: 22,
	},
});

function zoomTransitionName(id: string): string {
	return `outline-node-${id}`;
}

function zoomTo(setZoomedId: (id: string | null) => void, id: string | null) {
	if (!document.startViewTransition) {
		setZoomedId(id);
		return;
	}

	const transition = document.startViewTransition(() =>
		flushSync(() => setZoomedId(id)),
	);

	transition.ready.catch(() => {});
	transition.finished.catch(() => {});
}

const Outline = observer(function Outline() {
	const store = useOutlineStore();
	const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
	const [zoomedId, setZoomedId] = useState<string | null>(null);

	if (store.status !== "ready") {
		return null;
	}

	const zoomed = zoomedId ? store.subtree(zoomedId) : null;
	const nodes = zoomed ? zoomed.children : store.tree;

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
						onZoomTo={(id) => zoomTo(setZoomedId, id)}
						onChange={(state) => store.setContent(zoomed.id, state.toJSON())}
					/>
				</div>
			)}
			<VirtualList
				nodes={nodes}
				rootId={zoomedId}
				onMove={(id, parentId, index) => store.move(id, parentId, index)}
			>
				{(node) => (
					<OutlinerContextMenu
						node={node}
						onOpenChange={(open) => setMenuOpenId(open ? node.id : null)}
						onZoomIn={(id) => zoomTo(setZoomedId, id)}
					>
						<Row
							active={menuOpenId === node.id}
							style={{ viewTransitionName: zoomTransitionName(node.id) }}
						>
							<DragHandle />
							<Bullet
								collapsed={node.collapsed && node.children.length > 0}
								onClick={() => zoomTo(setZoomedId, node.id)}
							/>
							{node.task && (
								<TaskMarker
									variant={node.task.done ? "done" : "todo"}
									onClick={() =>
										store.setTask(node.id, { done: !node.task?.done })
									}
								/>
							)}
							<Content
								onChange={(state) => store.setContent(node.id, state.toJSON())}
							/>
						</Row>
					</OutlinerContextMenu>
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

function Home() {
	return (
		<OutlineStoreProvider>
			<Outline />
			<DevSeedToolbar />
		</OutlineStoreProvider>
	);
}

export const Route = createFileRoute("/")({ component: Home });
