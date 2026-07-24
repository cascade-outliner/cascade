import { Dialog } from "@base-ui/react";
import type {
	TreeHistoryCursor,
	TreeHistoryDetail,
	TreeHistoryEventKind,
	TreeHistoryPayload,
	TreeHistorySnapshot,
} from "@cascade/api/tree-history-schema";
import type { LexicalElementNode } from "@cascade/outliner/lexical/read/lexical-read-view";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { Button } from "@cascade/ui/button";
import { toast } from "@cascade/ui/toast";
import {
	ArrowCounterClockwiseIcon,
	CircleNotchIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { usePremiumStatus } from "@/features/premium/client/use-premium";
import { PremiumUpsellNotice } from "@/features/premium/ui/premium-upsell-notice";
import { client, orpc } from "@/orpc/client";

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

function actionLabel(kind: TreeHistoryEventKind): string {
	switch (kind) {
		case "node_created":
			return m.tree_history_action_created();
		case "subtree_duplicated":
			return m.tree_history_action_duplicated();
		case "content_changed":
			return m.tree_history_action_content();
		case "node_moved":
			return m.tree_history_action_moved();
		case "subtree_deleted":
			return m.tree_history_action_deleted();
		case "subtree_restored":
			return m.tree_history_action_restored();
		case "type_changed":
			return m.tree_history_action_type();
		case "due_date_changed":
			return m.tree_history_action_due_date();
		case "tags_changed":
			return m.tree_history_action_tags();
		case "tag_deleted":
			return m.tree_history_action_tag_deleted();
		case "tag_restored":
			return m.tree_history_action_tag_restored();
	}
}

function ContentPreview({ content }: { content: unknown }) {
	return (
		<div className="min-h-16 rounded-md border border-ink/10 bg-white p-3 text-sm dark:border-surface/15 dark:bg-ink">
			<LexicalReadView
				content={content as { root: LexicalElementNode } | null}
			/>
		</div>
	);
}

function BeforeAfter({
	before,
	after,
	render = (value) => String(value ?? "—"),
}: {
	before: unknown;
	after: unknown;
	render?: (value: unknown) => React.ReactNode;
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div>
				<div className="mb-1 font-semibold text-xs uppercase tracking-wide">
					{m.tree_history_before()}
				</div>
				{render(before)}
			</div>
			<div>
				<div className="mb-1 font-semibold text-xs uppercase tracking-wide">
					{m.tree_history_after()}
				</div>
				{render(after)}
			</div>
		</div>
	);
}

function SubtreePreview({ snapshots }: { snapshots: TreeHistorySnapshot[] }) {
	if (snapshots.length === 0) return null;
	return (
		<div className="max-h-80 overflow-auto rounded-md border border-ink/10 p-2 dark:border-surface/15">
			{snapshots.map((snapshot) => (
				<div
					key={snapshot.nodeId}
					className="py-1"
					style={{ paddingLeft: `${snapshot.depth * 20}px` }}
				>
					<LexicalReadView
						content={snapshot.content as { root: LexicalElementNode } | null}
					/>
				</div>
			))}
		</div>
	);
}

function EventPreview({ detail }: { detail: TreeHistoryDetail }) {
	const payload: TreeHistoryPayload = detail.payload;
	switch (payload.kind) {
		case "content_changed":
			return (
				<BeforeAfter
					before={payload.before}
					after={payload.after}
					render={(value) => <ContentPreview content={value} />}
				/>
			);
		case "type_changed":
			return (
				<BeforeAfter before={payload.before.type} after={payload.after.type} />
			);
		case "due_date_changed":
			return <BeforeAfter before={payload.before} after={payload.after} />;
		case "tags_changed":
			return (
				<BeforeAfter
					before={payload.before}
					after={payload.after}
					render={(value) => (
						<p className="text-sm">
							{(value as string[]).join(", ") || m.tree_history_none()}
						</p>
					)}
				/>
			);
		case "node_moved":
			return (
				<BeforeAfter
					before={payload.before.parentId ?? m.tree_history_root()}
					after={payload.after.parentId ?? m.tree_history_root()}
				/>
			);
		case "tag_deleted":
		case "tag_restored":
			return (
				<p className="text-sm">
					{payload.name} ·{" "}
					{m.tree_history_nodes_affected({ count: payload.nodeIds.length })}
				</p>
			);
		case "subtree_deleted":
		case "node_created":
		case "subtree_duplicated":
		case "subtree_restored":
			return <SubtreePreview snapshots={detail.snapshots} />;
	}
}

export function TreeHistoryDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: premium } = usePremiumStatus();
	const enabled = open && premium?.isPremium === true;
	const queryClient = useQueryClient();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null,
	);

	const timeline = useInfiniteQuery({
		queryKey: orpc.treeHistory.list.key(),
		queryFn: ({ pageParam }) =>
			client.treeHistory.list({ cursor: pageParam, limit: 50 }),
		initialPageParam: null as TreeHistoryCursor | null,
		getNextPageParam: (page) => page.nextCursor,
		enabled,
	});
	const items = useMemo(
		() => timeline.data?.pages.flatMap((page) => page.items) ?? [],
		[timeline.data],
	);
	const selected =
		items.find(({ id }) => id === selectedId) ?? items[0] ?? null;
	const detail = useQuery({
		queryKey: ["tree-history", "detail", selected?.id],
		queryFn: () => client.treeHistory.get({ id: selected?.id as string }),
		enabled: enabled && !!selected,
	});

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollElement,
		estimateSize: () => 62,
		overscan: 8,
		getItemKey: (index) => items[index]?.id ?? index,
	});
	const virtualItems = virtualizer.getVirtualItems();
	useEffect(() => {
		const last = virtualItems.at(-1);
		if (
			last &&
			last.index >= items.length - 5 &&
			timeline.hasNextPage &&
			!timeline.isFetchingNextPage
		) {
			timeline.fetchNextPage();
		}
	}, [
		items.length,
		timeline.fetchNextPage,
		timeline.hasNextPage,
		timeline.isFetchingNextPage,
		virtualItems,
	]);

	const restore = useMutation({
		mutationFn: (id: string) => client.treeHistory.restore({ id }),
		onSuccess: async () => {
			toast.success(m.tree_history_restore_success());
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.treeHistory.list.key(),
				}),
				queryClient.invalidateQueries({ queryKey: ["tree-history", "detail"] }),
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.visibleTree.key(),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.ancestors.key() }),
				queryClient.invalidateQueries({ queryKey: orpc.nodes.listTags.key() }),
			]);
		},
		onError: () => toast.error(m.tree_history_restore_failed()),
	});
	const canRestore =
		detail.data?.restorable === true &&
		(!detail.data.nodeDeleted || detail.data.kind === "subtree_deleted");

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[min(850px,calc(100vh-1rem))] w-[min(1200px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface">
					<header className="flex items-center justify-between border-ink/10 border-b px-5 py-4 dark:border-surface/15">
						<Dialog.Title className="font-semibold text-lg">
							{m.tree_history_title()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.tree_history_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</header>

					{premium && !premium.isPremium ? (
						<div className="flex flex-1 items-center justify-center p-6">
							<PremiumUpsellNotice
								description={m.tree_history_premium_description()}
							/>
						</div>
					) : timeline.isPending || premium === undefined ? (
						<div className="flex flex-1 items-center justify-center">
							<CircleNotchIcon size={28} className="animate-spin" />
						</div>
					) : items.length === 0 ? (
						<div className="flex flex-1 items-center justify-center p-6 text-center text-ink/60 dark:text-surface/60">
							{m.tree_history_empty()}
						</div>
					) : (
						<div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
							<div
								ref={setScrollElement}
								className="min-h-0 overflow-auto border-ink/10 border-b md:border-r md:border-b-0 dark:border-surface/15"
							>
								<div
									className="relative"
									style={{ height: virtualizer.getTotalSize() }}
								>
									{virtualItems.map((virtualItem) => {
										const item = items[virtualItem.index];
										if (!item) return null;
										return (
											<button
												key={virtualItem.key}
												ref={virtualizer.measureElement}
												data-index={virtualItem.index}
												type="button"
												onClick={() => setSelectedId(item.id)}
												className={`absolute left-0 flex w-full cursor-pointer flex-col items-start gap-0.5 border-ink/5 border-b px-4 py-2 text-left outline-none hover:bg-ink/5 dark:border-surface/10 dark:hover:bg-surface/10 ${
													item.id === selected?.id
														? "bg-ink/5 dark:bg-surface/10"
														: ""
												}`}
												style={{
													transform: `translateY(${virtualItem.start}px)`,
												}}
											>
												<span className="flex w-full items-center gap-1 font-medium text-sm">
													{item.nodeDeleted && <TrashIcon size={13} />}
													<span className="truncate">
														{actionLabel(item.kind)} ·{" "}
														{item.label || m.breadcrumbs_untitled()}
													</span>
												</span>
												<span className="text-ink/55 text-xs dark:text-surface/55">
													{timestampFormatter.format(new Date(item.createdAt))}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							<div
								className="min-h-0 overflow-auto p-5"
								data-testid="tree-history-detail"
							>
								{detail.isPending || !detail.data ? (
									<div className="flex h-full items-center justify-center">
										<CircleNotchIcon size={24} className="animate-spin" />
									</div>
								) : (
									<div className="flex flex-col gap-5">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<h2 className="font-semibold">
													{actionLabel(detail.data.kind)}
												</h2>
												<p className="text-ink/60 text-sm dark:text-surface/60">
													{detail.data.label || m.breadcrumbs_untitled()} ·{" "}
													{timestampFormatter.format(
														new Date(detail.data.createdAt),
													)}
												</p>
											</div>
											<Button
												type="button"
												size="sm"
												onClick={() => restore.mutate(detail.data.id)}
												disabled={!canRestore || restore.isPending}
											>
												<ArrowCounterClockwiseIcon size={14} />
												{m.tree_history_restore()}
											</Button>
										</div>
										{detail.data.nodeDeleted &&
											detail.data.kind !== "subtree_deleted" && (
												<p className="rounded-md bg-danger/10 p-3 text-danger text-sm">
													{m.tree_history_restore_deletion_first()}
												</p>
											)}
										<EventPreview detail={detail.data} />
									</div>
								)}
							</div>
						</div>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
