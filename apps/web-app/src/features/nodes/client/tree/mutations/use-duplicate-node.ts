import { markRowEntering } from "@cascade/outliner/row-lifecycle-motion";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";

/**
 * Duplicating creates brand-new descendant rows server-side that the client
 * has never seen, so (unlike every other mutation here) this can't just
 * patch the shared raw cache in place — it refetches the whole tree once
 * the duplicate lands, which is cheap now that the whole tree is one fetch.
 */
export function useDuplicateMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (vars: { id: string }) => client.nodes.duplicate(vars),
	});

	return (id: string) => {
		const run = async () => {
			const created = await mutation.mutateAsync({ id });
			await queryClient.invalidateQueries({ queryKey });
			markRowEntering(created.id);
		};

		// One toast for the whole operation (server round trip plus the
		// follow-up refetch): a spinner while pending, morphing in place into
		// success/error on settle.
		return toast
			.promise(run(), {
				loading: m.node_duplicating(),
				success: m.node_duplicated(),
				error: m.node_duplicate_failed(),
			})
			.catch(() => {
				// Already surfaced by the error toast above.
			});
	};
}
