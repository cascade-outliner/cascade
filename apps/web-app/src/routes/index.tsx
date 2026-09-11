import { textState } from "@cascade/data";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { CaptureBar } from "@cascade/ui/outliner/capture-bar";
import { Content } from "@cascade/ui/outliner/content";
import { OutlinerContextMenu } from "@cascade/ui/outliner/context-menu";
import { DragHandle } from "@cascade/ui/outliner/drag-handle";
import { Row } from "@cascade/ui/outliner/row";
import { TaskMarker } from "@cascade/ui/outliner/task-marker";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
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
});

const Outline = observer(function Outline() {
	const store = useOutlineStore();
	if (store.status !== "ready") {
		return null;
	}

	return (
		<div {...stylex.props(styles.page)}>
			<VirtualList nodes={store.tree}>
				{(node) => (
					<OutlinerContextMenu
						onDelete={() => store.remove(node.id)}
						onConvertToTask={() =>
							store.setTask(node.id, node.task ? null : { done: false })
						}
					>
						<Row>
							<DragHandle />
							<Bullet collapsed={node.collapsed && node.children.length > 0} />
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
					const id = store.create();
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
		</OutlineStoreProvider>
	);
}

export const Route = createFileRoute("/")({ component: Home });
