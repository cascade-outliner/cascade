import { Button } from "@cascade/ui/button";
import { CrownIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { useRequestPremiumSeat } from "@/ui/premium/use-premium";

/**
 * Generic fallback UI for any premium-gated feature: an icon, a
 * feature-specific description, and a "Request premium seat" button that
 * unlocks it immediately (premium is free to request for now — see
 * `PremiumTab`). Drop this in wherever a feature's UI would otherwise
 * render once `usePremiumStatus().data?.isPremium` is `false`.
 */
export function PremiumUpsellNotice({ description }: { description: string }) {
	const { requestSeat, isRequesting } = useRequestPremiumSeat();

	return (
		<div className="flex flex-col items-center gap-3 py-8 text-center text-sm">
			<CrownIcon size={28} weight="fill" className="text-primary" />
			<p className="max-w-xs text-ink/70 dark:text-surface/70">{description}</p>
			<Button
				type="button"
				size="sm"
				variant="primary"
				disabled={isRequesting}
				onClick={requestSeat}
			>
				{m.user_menu_premium_request_button()}
			</Button>
		</div>
	);
}
