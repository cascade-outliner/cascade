import { type Node, textState } from "@cascade/data";
import { Button } from "@cascade/ui/button";
import { Sheet } from "@cascade/ui/sheet";
import { PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { Drafts } from "#/components/split-tasks/drafts.tsx";
import {
	addTasks,
	CANT_SPLIT,
	splitTasks,
	useSplit,
} from "#/components/split-tasks/split.ts";
import { useOutlineStore } from "#/lib/outline-store.tsx";
import { css } from "#/styled-system/css";

const styles = {
	// The parent the note becomes, above its drafts.
	title: css({
		paddingBlock: "1.5",
		paddingInline: "2.5",
		fontSize: "600",
		fontWeight: 600,
		color: "ink",
	}),
	drafts: css.raw({
		fontSize: "600",
	}),
};

export interface SplitSheetProps {
	node: Node;
	/** The node's text when the split was asked for. */
	text: string;
	/** The phrases tasks were pulled from, for highlighting the note. */
	onSources: (sources: string[]) => void;
	onClose: () => void;
}

/**
 * 3b: previews a note's split in a sheet, the same result the capture bar
 * shows: the note becomes the titled parent, the tasks go under it. The note
 * itself highlights what was pulled out (see `onSources`).
 */
export function SplitSheet({
	node,
	text,
	onSources,
	onClose,
}: SplitSheetProps) {
	const store = useOutlineStore();
	const { result, error } = useSplit(text);
	const tasks = splitTasks(result);

	const sourcesRef = useRef(onSources);
	sourcesRef.current = onSources;
	useEffect(() => {
		sourcesRef.current(splitTasks(result).map((task) => task.source));
	}, [result]);

	const add = () => {
		if (!result || tasks.length === 0) return;
		store.setContent(node.id, textState(result.title));
		addTasks(store, node.id, tasks);
		store.setCollapsed(node.id, false);
		onClose();
	};
	const addRef = useRef(add);
	addRef.current = add;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				addRef.current();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<Sheet.Root open onOpenChange={(open) => !open && onClose()}>
			<Sheet.Popup
				icon={<SparkleIcon size={15} />}
				title={
					!result
						? "Split into tasks"
						: tasks.length > 0
							? `Split into ${tasks.length} tasks`
							: "Can't split this note"
				}
				description={
					error ??
					(!result
						? "Reading the note…"
						: tasks.length === 0
							? CANT_SPLIT
							: undefined)
				}
				footer={
					tasks.length > 0 && (
						<Button variant="primary" onClick={add}>
							<PlusIcon size={13} weight="bold" aria-hidden />
							Add {tasks.length} tasks
						</Button>
					)
				}
			>
				{result && tasks.length > 0 && (
					<>
						<div className={styles.title}>{result.title}</div>
						<Drafts tasks={tasks} css={styles.drafts} />
					</>
				)}
			</Sheet.Popup>
		</Sheet.Root>
	);
}
