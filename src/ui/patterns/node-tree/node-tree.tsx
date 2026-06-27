import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";
import type { NodeWithMeta } from "#/db/schema";
import { orpc } from "#/orpc/client";
import { NodeMenu } from "#/ui/patterns/node-menu/node-menu";

type FlatNode = { node: NodeWithMeta; depth: number };

function buildFlat(
	nodes: NodeWithMeta[],
	depth: number,
	openSet: Set<string>,
	childrenMap: Map<string, NodeWithMeta[]>,
): FlatNode[] {
	return nodes.flatMap((node) => {
		const children = openSet.has(node.id)
			? (childrenMap.get(node.id) ?? [])
			: [];
		return [
			{ node, depth },
			...buildFlat(children, depth + 1, openSet, childrenMap),
		];
	});
}

export function NodeTree({
	roots,
	withTransition,
}: {
	roots: NodeWithMeta[];
	withTransition?: boolean;
}) {
	const queryClient = useQueryClient();
	const [openSet, setOpenSet] = useState<Set<string>>(() => {
		// Walk the pre-fetched cache to find all open node IDs synchronously,
		// so the tree renders fully-expanded on first paint with no re-render passes.
		const result = new Set<string>();
		const queue = [...roots];
		while (queue.length) {
			const node = queue.pop()!;
			if (node.isOpen) {
				result.add(node.id);
				const cached = queryClient.getQueryData<NodeWithMeta[]>(
					orpc.getChildren.queryOptions({ input: { parentId: node.id } })
						.queryKey,
				);
				if (cached) queue.push(...cached);
			}
		}
		return result;
	});

	const openIds = [...openSet];

	const childQueries = useQueries({
		queries: openIds.map((nodeId) =>
			orpc.getChildren.queryOptions({ input: { parentId: nodeId } }),
		),
	});

	const childrenMap = new Map(
		openIds.map((nodeId, i) => [nodeId, childQueries[i].data ?? []]),
	);

	const flatNodes = buildFlat(roots, 0, openSet, childrenMap);

	const virtualizer = useWindowVirtualizer({
		count: flatNodes.length,
		estimateSize: () => 32,
		overscan: 10,
	});

	const { mutate: updateNode } = useMutation(orpc.updateNode.mutationOptions());

	const toggle = (node: NodeWithMeta) => {
		const next = !openSet.has(node.id);
		setOpenSet((prev) => {
			const s = new Set(prev);
			if (next) s.add(node.id);
			else s.delete(node.id);
			return s;
		});
		updateNode({ id: node.id, isOpen: next });
	};

	return (
		<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
			{virtualizer.getVirtualItems().map((vItem) => {
				const { node, depth } = flatNodes[vItem.index];
				const isOpen = openSet.has(node.id);

				return (
					<div
						key={vItem.key}
						data-index={vItem.index}
						ref={virtualizer.measureElement}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${vItem.start}px)`,
						}}
					>
						<div
							className="group/node py-1 flex items-center gap-2"
							style={{ paddingLeft: depth * 16 }}
						>
							{node.hasChildren ? (
								<button
									type="button"
									onClick={() => toggle(node)}
									className={`shrink-0 text-gray-400 hover:text-gray-700 transition-all opacity-0 group-hover/node:opacity-100 ${isOpen ? "rotate-90" : ""}`}
								>
									<CaretRightIcon size={12} weight="bold" />
								</button>
							) : (
								<span className="w-3 shrink-0" />
							)}

							<Link
								to="/node/$nodeId"
								params={{ nodeId: node.id }}
								viewTransition
								className="w-2 h-2 rounded-full bg-gray-400 hover:bg-black transition-colors shrink-0"
							/>

							<div className="flex-1 flex items-center gap-2 min-w-0">
								<div
									className="outline-none wrap-break-word"
									style={
										withTransition
											? { viewTransitionName: `node-text-${node.id}` }
											: undefined
									}
								>
									{node.text}
								</div>
								<NodeMenu node={node} />
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
