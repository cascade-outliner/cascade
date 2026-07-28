import { Dialog } from "@base-ui/react";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { CircleNotchIcon, XIcon } from "@phosphor-icons/react/ssr";
import { useMemo, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { usePremiumStatus } from "@/features/premium/client/use-premium";
import { PremiumUpsellNotice } from "@/features/premium/ui/premium-upsell-notice";
import { useTreeHistoryTimeline } from "./queries";
import { historyDialogPopup } from "./tree-history.styles";
import { TreeHistoryDetailPane } from "./tree-history-detail";
import { TreeHistoryTimeline } from "./tree-history-timeline";

export function TreeHistoryDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: premium } = usePremiumStatus();
	const enabled = open && premium?.isPremium === true;
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const timeline = useTreeHistoryTimeline(enabled);
	const items = useMemo(
		() => timeline.data?.pages.flatMap((page) => page.items) ?? [],
		[timeline.data],
	);
	const selected =
		items.find(({ id }) => id === selectedId) ?? items[0] ?? null;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`${historyDialogPopup()} ${dialogPopupMotion()}`}
				>
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
							<TreeHistoryTimeline
								items={items}
								selectedId={selected?.id}
								onSelect={setSelectedId}
								hasNextPage={timeline.hasNextPage}
								isFetchingNextPage={timeline.isFetchingNextPage}
								onLoadMore={() => {
									timeline.fetchNextPage();
								}}
							/>
							<TreeHistoryDetailPane selected={selected} enabled={enabled} />
						</div>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
