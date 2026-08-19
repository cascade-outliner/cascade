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
		node("Tasks", [
			node("Compound components"),
			node("Keyboard shortcuts"),
		]),
		node("Something else"),
	]),
];

function Home() {
	return (
		<div className="mx-auto max-w-2xl p-8">
			<h1 className="mb-6 text-3xl font-bold">Outliner</h1>
			<Outliner.Root className="flex flex-col gap-1">
				{data.map((n) => (
					<Outliner.Row key={n.id} node={n} depth={0} />
				))}
			</Outliner.Root>
		</div>
	);
}
