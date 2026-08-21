import { type OutlineNode, Outliner } from "@cascade/ui";
import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: Dashboard,
});

function textState(text: string): SerializedEditorState {
	return {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}

function node(text: string, children: OutlineNode[] = []): OutlineNode {
	return { id: text, text: textState(text), children };
}

const data: OutlineNode[] = [
	node("Welcome to the outliner", [
		node("This is a static example"),
		node("Just the component structure, no editing"),
	]),
	node("Groceries", [node("Eggs"), node("Coffee"), node("Bread")]),
	node("Project ideas", [
		node("Tasks", [node("Compound components"), node("Keyboard shortcuts")]),
		node("Something else"),
	]),
];

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

	return (
		<div className="p-8 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p>Logged in as {session.user.email}</p>
				<button
					className="bg-ink text-canvas rounded px-3 py-2"
					type="button"
					onClick={() => authClient.signOut()}
				>
					Log out
				</button>
			</div>
			<Outliner.Root className="flex flex-col gap-1">
				{data.map((n) => (
					<OutlineRow key={n.id} node={n} depth={0} />
				))}
			</Outliner.Root>
		</div>
	);
}
