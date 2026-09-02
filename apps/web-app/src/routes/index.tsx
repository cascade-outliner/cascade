import { type OutlineNode, Outliner } from "@cascade/ui";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { observer } from "mobx-react-lite";
import { CreateNodeButton } from "#/components/create-node-button";
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
	previousSiblingId,
	parentId,
	grandParentId,
	onEdit,
	onDelete,
	onIndent,
	onOutdent,
	onToggle,
}: {
	node: OutlineNode;
	depth: number;
	previousSiblingId?: string;
	parentId?: string;
	grandParentId?: string;
	onEdit: (id: string, content: SerializedEditorState) => void;
	onDelete: (id: string) => void;
	onIndent: (id: string, newParentId: string) => void;
	onOutdent: (id: string, newParentId: string | null) => void;
	onToggle: (id: string, collapsed: boolean) => void;
}) {
	return (
		<Outliner.Item node={node} depth={depth}>
			<div {...stylex.props(styles.row)}>
				<Outliner.Actions
					previousSiblingId={previousSiblingId}
					parentId={parentId}
					grandParentId={grandParentId}
					onDelete={onDelete}
					onIndent={onIndent}
					onOutdent={onOutdent}
				/>
				<Outliner.Toggle onToggle={onToggle} />
				<Outliner.Bullet />
				<Outliner.Content
					onChange={(state) => onEdit(node.id, state.toJSON())}
				/>
			</div>
			<Outliner.Children>
				{(child, childDepth, previousSiblingId) => (
					<OutlineRow
						node={child}
						depth={childDepth}
						previousSiblingId={previousSiblingId}
						parentId={node.id}
						grandParentId={parentId}
						onEdit={onEdit}
						onDelete={onDelete}
						onIndent={onIndent}
						onOutdent={onOutdent}
						onToggle={onToggle}
					/>
				)}
			</Outliner.Children>
		</Outliner.Item>
	);
}

const Outline = observer(function Outline() {
	const store = useOutlineStore();

	return (
		<div {...stylex.props(styles.page)}>
			<div {...stylex.props(styles.toolbar)}>
				<CreateNodeButton />
			</div>
			<Outliner.Root style={styles.outline}>
				<Outliner.List nodes={store.tree}>
					{(n, depth, previousSiblingId) => (
						<OutlineRow
							node={n}
							depth={depth}
							previousSiblingId={previousSiblingId}
							onEdit={(id, content) => store.setContent(id, content)}
							onDelete={(id) => store.remove(id)}
							onIndent={(id, newParentId) => store.move(id, newParentId)}
							onOutdent={(id, newParentId) => store.move(id, newParentId)}
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
