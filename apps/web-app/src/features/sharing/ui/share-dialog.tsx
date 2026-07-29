import { Dialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import { Checkbox } from "@cascade/ui/checkbox";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import { toast } from "@cascade/ui/toast";
import {
	CopyIcon,
	LinkIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useId, useState } from "react";
import { m } from "#/paraglide/messages.js";
import {
	sharedTreeUrl,
	useCreateShare,
	useNodeShares,
	useRevokeShare,
} from "@/features/sharing/client/use-node-shares";

function copyShareLink(token: string) {
	const url = sharedTreeUrl(token);
	void navigator.clipboard.writeText(url).then(
		() => toast.success(m.sharing_link_copied()),
		() => toast.error(m.sharing_copy_failed()),
	);
}

export function ShareDialog({
	nodeId,
	open,
	onOpenChange,
}: {
	nodeId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: shares } = useNodeShares(nodeId, open);
	const { createShare, isCreating } = useCreateShare(nodeId);
	const { revokeShare, revokingId } = useRevokeShare(nodeId);
	const [requireLogin, setRequireLogin] = useState(false);
	const requireLoginId = useId();
	const activeShares = shares?.filter((share) => !share.revokedAt) ?? [];

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					className={`fixed top-1/2 left-1/2 z-50 flex max-h-[min(600px,calc(100vh-1rem))] w-[min(520px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface ${dialogPopupMotion()}`}
				>
					<header className="flex items-center justify-between border-ink/10 border-b px-5 py-4 dark:border-surface/15">
						<Dialog.Title className="font-semibold text-lg">
							{m.sharing_dialog_title()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.sharing_dialog_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</header>

					<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-5">
						<p className="text-ink/60 text-sm dark:text-surface/60">
							{m.sharing_dialog_description()}
						</p>

						<div className="flex items-center gap-2 text-sm">
							<Checkbox
								id={requireLoginId}
								checked={requireLogin}
								onCheckedChange={(checked) => setRequireLogin(checked === true)}
							/>
							<label htmlFor={requireLoginId}>
								{m.sharing_require_login()}
							</label>
						</div>

						<Button
							size="sm"
							icon={<LinkIcon size={16} weight="bold" />}
							disabled={isCreating}
							onClick={() => {
								void createShare(requireLogin).then((share) =>
									copyShareLink(share.token),
								);
							}}
						>
							{m.sharing_create_link()}
						</Button>

						{activeShares.length > 0 && (
							<ul className="flex flex-col gap-2 border-ink/10 border-t pt-4 dark:border-surface/15">
								{activeShares.map((share) => (
									<li
										key={share.id}
										className="flex items-center justify-between gap-3 text-sm"
									>
										<div className="min-w-0 flex-1">
											<div className="truncate text-ink/80 dark:text-surface/80">
												{sharedTreeUrl(share.token)}
											</div>
											<div className="text-ink/50 text-xs dark:text-surface/50">
												{share.requireLogin
													? m.sharing_requires_login_badge()
													: m.sharing_public_badge()}
											</div>
										</div>
										<button
											type="button"
											aria-label={m.sharing_copy_link()}
											className="cursor-pointer rounded-md p-1.5 outline-none hover:bg-ink/5 dark:hover:bg-surface/10"
											onClick={() => copyShareLink(share.token)}
										>
											<CopyIcon size={16} />
										</button>
										<button
											type="button"
											aria-label={m.sharing_revoke_link()}
											disabled={revokingId === share.id}
											className="cursor-pointer rounded-md p-1.5 text-danger outline-none hover:bg-danger/10 disabled:cursor-default disabled:opacity-40"
											onClick={() => revokeShare(share.id)}
										>
											<TrashIcon size={16} />
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
