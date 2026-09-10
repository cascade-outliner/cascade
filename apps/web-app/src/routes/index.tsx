import { type OutlineNode, Outliner } from "@cascade/ui";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { observer } from "mobx-react-lite";
import { CreateNodeButton } from "#/components/create-node-button";
import { SeedToolbar } from "#/components/seed-toolbar.tsx";
import { OutlineStoreProvider, useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	row: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: 4,
	},
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

function OutlineRow({
	node,
	depth,
	onEdit,
	onToggle,
}: {
	node: OutlineNode;
	depth: number;
	onEdit: (id: string, content: SerializedEditorState) => void;
	onToggle: (id: string, collapsed: boolean) => void;
}) {
	return (
		<Outliner.Item node={node} depth={depth}>
			<div {...stylex.props(styles.row)}>
				<Outliner.Content
					onChange={(state) => onEdit(node.id, state.toJSON())}
				/>
			</div>
			<Outliner.Children>
				{(child, childDepth) => (
					<OutlineRow
						node={child}
						depth={childDepth}
						onEdit={onEdit}
						onToggle={onToggle}
					/>
				)}
			</Outliner.Children>
		</Outliner.Item>
	);
}

const Outline = observer(function Outline() {
	const store = useOutlineStore();
	if (store.status !== "ready") {
		return null;
	}

	return (
		<div {...stylex.props(styles.page)}>
			<div {...stylex.props(styles.toolbar)}>
				<CreateNodeButton />
				<SeedToolbar />
			</div>
			<Outliner.Root style={styles.outline}>
				<Outliner.List nodes={store.tree}>
					{(n, depth) => (
						<OutlineRow
							node={n}
							depth={depth}
							onEdit={(id, content) => store.setContent(id, content)}
							onToggle={(id, collapsed) => store.setCollapsed(id, collapsed)}
						/>
					)}
				</Outliner.List>
			</Outliner.Root>
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
