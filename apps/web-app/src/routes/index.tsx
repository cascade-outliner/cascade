import { AddNodeButton } from "@cascade/ui/outliner/add-node-button";
import { Bullet } from "@cascade/ui/outliner/bullet";
import { Content } from "@cascade/ui/outliner/content";
import { DragHandle } from "@cascade/ui/outliner/drag-handle";
import { Root } from "@cascade/ui/outliner/root";
import { Row } from "@cascade/ui/outliner/row";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { SeedToolbar } from "#/components/seed-toolbar.tsx";
import { OutlineStoreProvider, useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	page: {
		padding: 32,
		display: "flex",
		flexDirection: "column",
		gap: 16,
	},
	toolbar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
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
			<div {...stylex.props(styles.toolbar)}>
				<SeedToolbar />
			</div>
			<Root style={styles.outline}>
				<VirtualList nodes={store.tree}>
					{(node) => (
						<Row>
							<DragHandle />
							<Bullet collapsed={node.collapsed && node.children.length > 0} />
							<Content
								onChange={(state) => store.setContent(node.id, state.toJSON())}
							/>
						</Row>
					)}
				</VirtualList>
			</Root>
			<AddNodeButton onClick={() => store.create()}>Add Node</AddNodeButton>
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
