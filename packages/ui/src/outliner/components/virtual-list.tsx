import type { OutlineNode } from "@cascade/data";
import * as stylex from "@stylexjs/stylex";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ItemContext } from "../context";

const styles = stylex.create({
	viewport: {
		position: "relative",
		width: "100%",
	},
	row: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		paddingBottom: 4,
	},
});

interface FlatNode {
	node: OutlineNode;
	depth: number;
}

function flatten(nodes: OutlineNode[], depth: number, out: FlatNode[]) {
	for (const node of nodes) {
		out.push({ node, depth });
		if (node.children.length > 0 && !node.collapsed) {
			flatten(node.children, depth + 1, out);
		}
	}
	return out;
}

export interface VirtualListProps {
	nodes: OutlineNode[];
	children: (node: OutlineNode, depth: number) => React.ReactNode;
	/** Row height guess before measurement, in px. */
	estimateSize?: number;
	overscan?: number;
}

export function VirtualList({
	nodes,
	children,
	estimateSize = 32,
	overscan = 8,
}: VirtualListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const rows = flatten(nodes, 0, []);

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => estimateSize,
		overscan,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
	});

	return (
		<div
			ref={parentRef}
			{...stylex.props(styles.viewport)}
			style={{ height: virtualizer.getTotalSize() }}
		>
			{virtualizer.getVirtualItems().map((item) => {
				const { node, depth } = rows[item.index];
				return (
					<div
						key={node.id}
						ref={virtualizer.measureElement}
						data-index={item.index}
						{...stylex.props(styles.row)}
						style={{
							paddingLeft: depth * 12,
							transform: `translateY(${
								item.start - virtualizer.options.scrollMargin
							}px)`,
						}}
					>
						<ItemContext.Provider value={{ node, depth }}>
							{children(node, depth)}
						</ItemContext.Provider>
					</div>
				);
			})}
		</div>
	);
}
