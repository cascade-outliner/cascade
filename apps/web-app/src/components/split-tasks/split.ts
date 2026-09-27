import { isoDay, type OutlineStore, textState } from "@cascade/data";
import { useEffect, useState } from "react";
import {
	type SplitResult,
	type SplitTask,
	splitIntoTasks,
} from "#/server/split.ts";

export const CANT_SPLIT =
	"This task cannot be split, as it is most likely already a single task. Try rewording it to be more general, or add more context to it.";

/** Asks the server to split `text` once, when mounted. */
export function useSplit(text: string): {
	result?: SplitResult;
	error?: string;
} {
	const [state, setState] = useState<{ result?: SplitResult; error?: string }>(
		{},
	);
	useEffect(() => {
		let live = true;
		splitIntoTasks({ data: { text, today: isoDay(new Date()) } })
			.then((result) => live && setState({ result }))
			.catch((error) => {
				console.error("Split: request failed", error);
				if (live) setState({ error: "Couldn't split this line right now." });
			});
		return () => {
			live = false;
		};
	}, [text]);
	return state;
}

/** The tasks worth offering: a split into fewer than two isn't one. */
export function splitTasks(result: SplitResult | undefined): SplitTask[] {
	return result && result.tasks.length > 1 ? result.tasks : [];
}

/**
 * What accepting a split does, wherever it came from: `parentId` becomes the
 * titled parent and every task goes under it as a task node.
 */
export function addTasks(
	store: OutlineStore,
	parentId: string,
	tasks: SplitTask[],
): void {
	for (const task of tasks) {
		// ponytail: nodes have no owner field yet, so an owner rides along as an @mention.
		const text =
			task.owner && !task.text.includes(task.owner)
				? `${task.text} @${task.owner}`
				: task.text;
		const id = store.create(parentId, { content: textState(text) });
		store.setTask(id, { done: false });
		if (task.due) store.setDue(id, task.due);
	}
}
