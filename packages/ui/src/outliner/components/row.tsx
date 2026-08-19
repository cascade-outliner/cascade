import type { OutlineNode } from "../types";
import { Bullet } from "./bullet";
import { Children } from "./children";
import { Content } from "./content";
import { Item } from "./item";
import { Toggle } from "./toggle";

export function Row({ node, depth }: { node: OutlineNode; depth: number }) {
	return (
		<Item node={node} depth={depth}>
			<div className="flex items-start gap-1">
				<Toggle />
				<Bullet />
				<Content />
			</div>
			<Children />
		</Item>
	);
}
