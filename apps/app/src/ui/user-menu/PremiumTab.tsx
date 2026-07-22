import { Button } from "@cascade/ui/button";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import {
	usePremiumStatus,
	useRequestPremiumSeat,
	useRevokePremiumSeat,
} from "@/ui/premium/use-premium";

const grantedDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

export function PremiumTab() {
	const { data } = usePremiumStatus();
	const { requestSeat, isRequesting } = useRequestPremiumSeat();
	const { revokeSeat, isRevoking } = useRevokePremiumSeat();

	return (
		<div className="flex flex-col gap-3 text-sm">
			{data?.isPremium ? (
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<CheckCircleIcon
							size={20}
							weight="fill"
							className="shrink-0 text-primary"
						/>
						<div>
							<div className="font-semibold">
								{m.user_menu_premium_active()}
							</div>
							{data.grantedAt && (
								<div className="text-ink/60 dark:text-surface/60">
									{m.user_menu_premium_granted_on({
										date: grantedDateFormatter.format(new Date(data.grantedAt)),
									})}
								</div>
							)}
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="dark"
						disabled={isRevoking}
						onClick={revokeSeat}
					>
						{m.user_menu_premium_remove_button()}
					</Button>
				</div>
			) : (
				<>
					<p>{m.user_menu_premium_description()}</p>
					<Button
						type="button"
						size="sm"
						variant="primary"
						disabled={isRequesting}
						onClick={requestSeat}
						className="self-start"
					>
						{m.user_menu_premium_request_button()}
					</Button>
				</>
			)}
			<div>
				<div className="font-semibold">
					{m.user_menu_premium_features_heading()}
				</div>
				<ul className="mt-1 list-disc pl-5">
					<li>{m.user_menu_premium_feature_themes()}</li>
				</ul>
			</div>
			<p className="text-ink/60 dark:text-surface/60">
				{m.user_menu_premium_free_notice()}
			</p>
		</div>
	);
}
