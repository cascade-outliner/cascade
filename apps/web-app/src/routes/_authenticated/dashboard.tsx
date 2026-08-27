import { type OutlineNode, Outliner } from "@cascade/ui";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { observer } from "mobx-react-lite";
import { CreateNodeButton } from "#/components/create-node-button";
import { useNodeStore } from "#/context/store-context.tsx";
import { authClient } from "#/lib/auth-client.ts";

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
	const debouncedEdit = useDebouncedCallback(
		(content: SerializedEditorState) => onEdit(node.id, content),
		{ wait: 500 },
	);

	return (
		<Outliner.Item node={node} depth={depth}>
			<div className="relative flex items-center gap-1">
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
				<Outliner.Content onChange={(state) => debouncedEdit(state.toJSON())} />
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

const Dashboard = observer(function Dashboard() {
	const { session } = Route.useRouteContext();
	const store = useNodeStore();

	return (
		<div className="p-8 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p>Logged in as {session.user.email}</p>
				<div className="flex items-center gap-2">
					<CreateNodeButton />
					<button
						className="bg-ink text-canvas rounded px-3 py-2"
						type="button"
						onClick={async () => {
							await authClient.signOut();
							store.reset();
						}}
					>
						Log out
					</button>
				</div>
			</div>
			<Outliner.Root className="flex flex-col gap-1">
				<Outliner.List nodes={store.tree}>
					{(n, depth, previousSiblingId) => (
						<OutlineRow
							node={n}
							depth={depth}
							previousSiblingId={previousSiblingId}
							onEdit={(id, content) => store.setContent(id, content)}
							onDelete={(id) => store.removeNode(id)}
							onIndent={(id, newParentId) => store.move(id, newParentId)}
							onOutdent={(id, newParentId) => store.move(id, newParentId)}
							onToggle={(id, collapsed) => store.setExpanded(id, !collapsed)}
						/>
					)}
				</Outliner.List>
			</Outliner.Root>
		</div>
	);
});

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
});
