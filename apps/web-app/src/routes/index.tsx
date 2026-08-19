import { type OutlineNode, Outliner } from "@cascade/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function node(text: string, children: OutlineNode[] = []): OutlineNode {
	return { id: text, text, children };
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
			<div className="flex items-start gap-1">
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

function Home() {
	return (
		<div className="mx-auto max-w-2xl p-8">
			<h1 className="mb-6 text-3xl font-bold">Outliner</h1>
			<Outliner.Root className="flex flex-col gap-1">
				{data.map((n) => (
					<OutlineRow key={n.id} node={n} depth={0} />
				))}
			</Outliner.Root>
		</div>
	);
}
