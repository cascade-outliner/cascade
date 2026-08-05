import { toast } from "@cascade/ui/toast";
import { useMutation } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import type { AccountDataExport } from "@/features/account-data/server/account-data-procedures";
import { orpc } from "@/orpc/client";

function downloadJson(data: AccountDataExport): void {
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `cascade-account-export-${data.exportedAt.slice(0, 10)}.json`;
	link.click();
	URL.revokeObjectURL(url);
}

/** Requests a full JSON dump of the current user's account data and triggers
 * a browser download of the result. */
export function useExportAccountData() {
	const mutation = useMutation(
		orpc.accountData.export.mutationOptions({
			onSuccess: (data) => {
				downloadJson(data);
				toast.success(m.settings_export_success());
			},
			onError: () => toast.error(m.settings_export_failed()),
		}),
	);
	return {
		exportData: () => mutation.mutate(undefined),
		isExporting: mutation.isPending,
	};
}
