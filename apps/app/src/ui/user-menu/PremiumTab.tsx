import { Button } from "@cascade/ui/button";
import { toast } from "@cascade/ui/toast";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { orpc } from "@/orpc/client";

const grantedDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

export function PremiumTab() {
	const queryClient = useQueryClient();
	const queryOptions = orpc.premium.get.queryOptions();
	const { data } = useQuery(queryOptions);

	const { mutate, isPending } = useMutation(
		orpc.premium.requestSeat.mutationOptions({
			onSuccess: (status) => {
				queryClient.setQueryData(queryOptions.queryKey, status);
				toast.success(m.user_menu_premium_request_success());
			},
			onError: () => {
				toast.error(m.user_menu_premium_request_failed());
			},
		}),
	);

	if (data?.isPremium) {
		return (
			<div className="flex items-center gap-3 text-sm">
				<CheckCircleIcon
					size={20}
					weight="fill"
					className="shrink-0 text-primary"
				/>
				<div>
					<div className="font-semibold">{m.user_menu_premium_active()}</div>
					{data.grantedAt && (
						<div className="text-ink/60 dark:text-surface/60">
							{m.user_menu_premium_granted_on({
								date: grantedDateFormatter.format(new Date(data.grantedAt)),
							})}
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 text-sm">
			<p>{m.user_menu_premium_description()}</p>
			<Button
				type="button"
				size="sm"
				variant="primary"
				disabled={isPending}
				onClick={() => mutate(undefined)}
			>
				{m.user_menu_premium_request_button()}
			</Button>
		</div>
	);
}
