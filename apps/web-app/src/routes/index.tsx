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
		padding: 32,
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

/** The row for a node and its zoomed-in header share this name, so the View Transitions API morphs one into the other instead of just cross-fading. */
function zoomTransitionName(id: string): string {
	return `outline-node-${id}`;
}

/** Swaps the zoomed node, cross-fading the outline via the View Transitions API when available. */
function zoomTo(setZoomedId: (id: string | null) => void, id: string | null) {
	if (!document.startViewTransition) {
		setZoomedId(id);
		return;
	}
	// A transition in flight when a new one starts gets skipped, rejecting its
	// promises — that's expected on fast repeat clicks, not an error to surface.
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

	// A zoomed node deleted out from under us just falls back to the root view.
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
			<VirtualList nodes={nodes}>
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
			<CaptureBar
				onSubmit={(text) => {
					const id = store.create(zoomedId);
					store.setContent(id, textState(text));
				}}
			/>
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
