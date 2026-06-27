import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import type { NodeWithMeta } from "#/db/schema";
import { orpc } from "#/orpc/client";
import { useInlineEdit } from "#/ui/hooks/use-inline-edit";
import { NodeMenu } from "#/ui/patterns/node-menu/node-menu";

type FlatNode = { node: NodeWithMeta; depth: number };

function EditableText({
	initialValue,
	onSave,
	onCancel,
	clickAt,
}: {
	initialValue: string;
	onSave: (value: string) => void;
	onCancel: () => void;
	clickAt?: { x: number; y: number };
}) {
	const { mountRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave,
		onCancel,
		clickAt,
	});
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: For now allow this
		<div
			ref={mountRef}
			contentEditable
			suppressContentEditableWarning
			className="outline-none wrap-break-word min-w-4 flex-1"
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
		>
			{initialValue}
		</div>
	);
}

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
	const [editingId, setEditingId] = useState<string | null>(null);
	const editClickAt = useRef<{ x: number; y: number } | undefined>(undefined);
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
								{editingId === node.id ? (
									<EditableText
										initialValue={node.text}
										clickAt={editClickAt.current}
										onSave={(text) => {
											const trimmed = text.trim();
											if (trimmed && trimmed !== node.text) {
												const queryOptions = node.parentId
													? orpc.getChildren.queryOptions({
															input: { parentId: node.parentId },
														})
													: orpc.listNodes.queryOptions();
												queryClient.setQueryData(
													queryOptions.queryKey,
													(old: NodeWithMeta[] | undefined) =>
														old?.map((n) =>
															n.id === node.id ? { ...n, text: trimmed } : n,
														),
												);
												updateNode(
													{ id: node.id, text: trimmed },
													{
														onSettled: () =>
															queryClient.invalidateQueries(queryOptions),
													},
												);
											}
											setEditingId(null);
										}}
										onCancel={() => setEditingId(null)}
									/>
								) : (
									// biome-ignore lint/a11y/useSemanticElements: div is used for interaction
									<div
										className="outline-none wrap-break-word cursor-text text-left"
										role="button"
										tabIndex={0}
										style={
											withTransition
												? { viewTransitionName: `node-text-${node.id}` }
												: undefined
										}
										onClick={(e) => {
											editClickAt.current = { x: e.clientX, y: e.clientY };
											setEditingId(node.id);
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") setEditingId(node.id);
										}}
									>
										{node.text}
									</div>
								)}
								<NodeMenu node={node} />
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
