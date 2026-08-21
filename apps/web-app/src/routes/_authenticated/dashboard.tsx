import { type OutlineNode, Outliner } from "@cascade/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CreateNodeButton } from "#/components/create-node-button";
import { authClient } from "#/lib/auth-client.ts";
import { buildTree } from "#/lib/build-tree.ts";
import { orpc } from "#/orpc/client.ts";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
});

function OutlineRow({ node, depth }: { node: OutlineNode; depth: number }) {
	return (
		<Outliner.Item node={node} depth={depth}>
			<div className="flex items-center gap-1">
				<Outliner.Toggle />
				<Outliner.Bullet />
				<Outliner.Content />
			</div>
			<Outliner.Children>
				{(child, childDepth) => <OutlineRow node={child} depth={childDepth} />}
			</Outliner.Children>
		</Outliner.Item>
	);
}

function Dashboard() {
	const { session } = Route.useRouteContext();
	const { data } = useQuery(orpc.nodes.list.queryOptions());
	const tree = buildTree(data?.nodes ?? []);

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
				{tree.map((n) => (
					<OutlineRow key={n.id} node={n} depth={0} />
				))}
			</Outliner.Root>
		</div>
	);
}
