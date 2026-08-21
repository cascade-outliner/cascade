import { type OutlineNode, Outliner } from "@cascade/ui";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { CreateNodeButton } from "#/components/create-node-button";
import { authClient } from "#/lib/auth-client.ts";
import { buildTree } from "#/lib/build-tree.ts";
import { orpc } from "#/orpc/client.ts";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
});

function OutlineRow({
	node,
	depth,
	previousSiblingId,
	onEdit,
	onDelete,
	onIndent,
}: {
	node: OutlineNode;
	depth: number;
	previousSiblingId?: string;
	onEdit: (id: string, content: SerializedEditorState) => void;
	onDelete: (id: string) => void;
	onIndent: (id: string, newParentId: string) => void;
}) {
	const debouncedEdit = useDebouncedCallback(
		(content: SerializedEditorState) => onEdit(node.id, content),
		{ wait: 500 },
	);

	return (
		<Outliner.Item node={node} depth={depth}>
			<div className="relative flex items-center gap-1">
				<Outliner.Actions onDelete={onDelete} />
				<Outliner.Toggle />
				<Outliner.Bullet />
				<Outliner.Content
					onChange={(state) => debouncedEdit(state.toJSON())}
					onIndent={
						previousSiblingId
							? () => onIndent(node.id, previousSiblingId)
							: undefined
					}
				/>
			</div>
			<Outliner.Children>
				{(child, childDepth, index) => (
					<OutlineRow
						node={child}
						depth={childDepth}
						previousSiblingId={node.children[index - 1]?.id}
						onEdit={onEdit}
						onDelete={onDelete}
						onIndent={onIndent}
					/>
				)}
			</Outliner.Children>
		</Outliner.Item>
	);
}

function Dashboard() {
	const { session } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const { data } = useQuery(orpc.nodes.list.queryOptions());
	const tree = buildTree(data?.nodes ?? []);
	const updateNode = useMutation(
		orpc.nodes.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.nodes.list.queryKey() });
			},
		}),
	);
	const deleteNode = useMutation(
		orpc.nodes.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.nodes.list.queryKey() });
			},
		}),
	);

	return (
		<div className="p-8 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p>Logged in as {session.user.email}</p>
				<div className="flex items-center gap-2">
					<CreateNodeButton />
					<button
						className="bg-ink text-canvas rounded px-3 py-2"
						type="button"
						onClick={() => authClient.signOut()}
					>
						Log out
					</button>
				</div>
			</div>
			<Outliner.Root className="flex flex-col gap-1">
				{tree.map((n, i) => (
					<OutlineRow
						key={n.id}
						node={n}
						depth={0}
						previousSiblingId={tree[i - 1]?.id}
						onEdit={(id, content) => updateNode.mutate({ id, content })}
						onDelete={(id) => deleteNode.mutate({ id })}
						onIndent={(id, newParentId) =>
							updateNode.mutate({ id, parentId: newParentId })
						}
					/>
				))}
			</Outliner.Root>
		</div>
	);
}
