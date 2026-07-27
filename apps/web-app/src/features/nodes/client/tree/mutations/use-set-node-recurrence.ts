import type { RecurrenceInput } from "@cascade/outliner/recurrence";
import type { QueryKey } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetRecurrenceMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		{ id: string; recurrence: RecurrenceInput | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setRecurrence(vars),
		patch: (old, { id, recurrence }) =>
			patchRows(
				(rows) =>
					rows.map((row) =>
						row.id === id
							? {
									...row,
									recurrence:
										recurrence && row.dueDate
											? {
													...recurrence,
													anchorDay: Number(row.dueDate.slice(8, 10)),
												}
											: null,
									metadata:
										recurrence && row.type === "task"
											? { completed: false }
											: row.metadata,
								}
							: row,
					),
				old,
			),
	});

	return (id: string, recurrence: RecurrenceInput | null) =>
		mutation.mutate({ id, recurrence });
}
