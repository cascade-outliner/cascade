import { Button } from "@cascade/ui/button";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import {
	usePremiumStatus,
	useRequestPremiumSeat,
	useRevokePremiumSeat,
} from "@/features/premium/client/use-premium";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";

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
		<>
			<SettingsPageDescription>
				{m.user_menu_premium_description()}
			</SettingsPageDescription>
			<SettingsSection title={m.settings_premium_status_section()}>
				<div className="flex flex-col items-start gap-4 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
					{data?.isPremium ? (
						<>
							<div className="flex items-center gap-3">
								<CheckCircleIcon
									size={24}
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
												date: grantedDateFormatter.format(
													new Date(data.grantedAt),
												),
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
						</>
					) : (
						<>
							<div>
								<div className="font-semibold">
									{m.settings_premium_available()}
								</div>
								<div className="mt-0.5 text-ink/60 dark:text-surface/60">
									{m.settings_premium_available_description()}
								</div>
							</div>
							<Button
								type="button"
								size="sm"
								variant="primary"
								disabled={isRequesting}
								onClick={requestSeat}
							>
								{m.user_menu_premium_request_button()}
							</Button>
						</>
					)}
				</div>
			</SettingsSection>
			<SettingsSection title={m.user_menu_premium_features_heading()}>
				<div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
					<div className="flex items-center gap-2">
						<CheckCircleIcon size={18} weight="fill" className="text-primary" />
						{m.user_menu_premium_feature_themes()}
					</div>
					<div className="flex items-center gap-2">
						<CheckCircleIcon size={18} weight="fill" className="text-primary" />
						{m.user_menu_premium_feature_tree_history()}
					</div>
				</div>
			</SettingsSection>
			<p className="mt-6 rounded-lg bg-primary/10 px-4 py-3 text-sm text-ink/70 dark:text-surface/70">
				{m.user_menu_premium_free_notice()}
			</p>
		</>
	);
}
