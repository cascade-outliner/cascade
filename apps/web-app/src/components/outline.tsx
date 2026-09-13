import { textState } from "@cascade/data";
import { space } from "@cascade/theme/tokens.stylex";
import { CaptureBar } from "@cascade/ui/capture-bar";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { Chevron } from "@cascade/ui/outliner/chevron";
import { Content } from "@cascade/ui/outliner/content";
import { Row } from "@cascade/ui/outliner/row";
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
						onZoomTo={zoomTo}
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
						onZoomIn={zoomTo}
					>
						<Row
							active={menuOpenId === node.id}
							style={{ viewTransitionName: zoomTransitionName(node.id) }}
						>
							<Chevron
								open={!node.collapsed}
								hidden={node.children.length === 0}
								onClick={() => store.setCollapsed(node.id, !node.collapsed)}
							/>
							<Bullet
								collapsed={node.collapsed && node.children.length > 0}
								onClick={() => zoomTo(node.id)}
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
