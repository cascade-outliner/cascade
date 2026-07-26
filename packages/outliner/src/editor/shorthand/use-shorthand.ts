import {
	$getRoot,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isTextNode,
	type ElementNode,
	type LexicalEditor,
	type TextNode,
} from "lexical";
import { useEffect, useRef } from "react";
import {
	parseShorthand,
	type ShorthandConfig,
	type ShorthandMatch,
} from "./shorthand-parser";

export interface ShorthandApplication {
	content: { root: unknown };
	tags: string[];
	dueDate?: Date;
}

interface TextSegment {
	node: TextNode;
	start: number;
	end: number;
}

interface TextRun {
	text: string;
	segments: TextSegment[];
	startsAtBoundary: boolean;
	endsAtBoundary: boolean;
}

function isInsideLink(node: TextNode): boolean {
	let parent = node.getParent();
	while (parent) {
		if (parent.getType() === "link" || parent.getType() === "autolink")
			return true;
		parent = parent.getParent();
	}
	return false;
}

function runsInBlock(block: ElementNode): TextRun[] {
	const runs: TextRun[] = [];
	let current: TextRun | null = null;
	let previousCharacter: string | null = null;
	const visit = (node: ElementNode) => {
		for (const child of node.getChildren()) {
			if ($isTextNode(child)) {
				if (isInsideLink(child)) {
					current = null;
					continue;
				}
				if (!current) {
					current = {
						text: "",
						segments: [],
						startsAtBoundary:
							previousCharacter === null || /\s/u.test(previousCharacter),
						endsAtBoundary: true,
					};
					runs.push(current);
				}
				const start = current.text.length;
				const text = child.getTextContent();
				current.text += text;
				current.segments.push({ node: child, start, end: start + text.length });
				previousCharacter = text.at(-1) ?? previousCharacter;
			} else if ($isElementNode(child)) {
				if (child.getType() === "link" || child.getType() === "autolink") {
					const linkText = child.getTextContent();
					if (current && linkText) {
						current.endsAtBoundary = /\s/u.test(linkText[0] ?? "");
					}
					previousCharacter = linkText.at(-1) ?? previousCharacter;
					current = null;
				} else {
					visit(child);
				}
			}
		}
	};
	visit(block);
	return runs;
}

function removeMatches(run: TextRun, matches: ShorthandMatch[]) {
	for (const match of [...matches].sort((a, b) => b.start - a.start)) {
		for (const segment of [...run.segments].reverse()) {
			const start = Math.max(match.start, segment.start);
			const end = Math.min(match.end, segment.end);
			if (start < end) {
				segment.node.spliceText(start - segment.start, end - start, "");
			}
		}
	}
}

function signature(match: ShorthandMatch): string {
	return match.kind === "tag"
		? `tag:${match.tag.toLowerCase()}`
		: `date:${match.phrase}`;
}

function collectMatches(config: ShorthandConfig) {
	const collected: { run: TextRun; match: ShorthandMatch }[] = [];
	for (const block of $getRoot().getChildren()) {
		if (!$isElementNode(block)) continue;
		for (const run of runsInBlock(block)) {
			for (const match of parseShorthand(run.text, config)) {
				if (match.start === 0 && !run.startsAtBoundary) continue;
				if (match.end === run.text.length && !run.endsAtBoundary) continue;
				collected.push({ run, match });
			}
		}
	}
	return collected;
}

export function useShorthand(
	editor: LexicalEditor,
	config: ShorthandConfig | undefined,
	onApply:
		| ((application: ShorthandApplication) => Promise<void> | void)
		| undefined,
	onContentCommitted?: (content: { root: unknown }) => void,
) {
	const configRef = useRef(config);
	const onApplyRef = useRef(onApply);
	const onContentCommittedRef = useRef(onContentCommitted);
	const pendingRef = useRef<Promise<void>>(Promise.resolve());
	configRef.current = config;
	onApplyRef.current = onApply;
	onContentCommittedRef.current = onContentCommitted;
	const baselineRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		if (!config) return;
		editor.getEditorState().read(() => {
			const baseline = new Map<string, number>();
			for (const { match } of collectMatches(config)) {
				const key = signature(match);
				baseline.set(key, (baseline.get(key) ?? 0) + 1);
			}
			baselineRef.current = baseline;
		});
	}, [config, editor]);

	const apply = (
		select: (
			all: { run: TextRun; match: ShorthandMatch }[],
		) => { run: TextRun; match: ShorthandMatch }[],
	): boolean => {
		const activeConfig = configRef.current;
		if (!activeConfig || !onApplyRef.current) return false;
		const before = editor.getEditorState();
		let selected: { run: TextRun; match: ShorthandMatch }[] = [];
		editor.update(
			() => {
				selected = select(collectMatches(activeConfig));
				if (selected.length === 0) return;
				const byRun = new Map<TextRun, ShorthandMatch[]>();
				for (const item of selected) {
					byRun.set(item.run, [...(byRun.get(item.run) ?? []), item.match]);
				}
				for (const [run, matches] of byRun) removeMatches(run, matches);
			},
			{
				onUpdate: () => {
					if (selected.length === 0) return;
					const tags = selected
						.filter(
							(
								item,
							): item is typeof item & {
								match: { kind: "tag"; tag: string; start: number; end: number };
							} => item.match.kind === "tag",
						)
						.map(({ match }) => match.tag);
					const lastDue = selected
						.filter(({ match }) => match.kind === "dueDate")
						.at(-1)?.match;
					const content = editor.getEditorState().toJSON();
					const request = Promise.resolve(
						onApplyRef.current?.({
							content: { root: content.root },
							tags,
							dueDate:
								lastDue?.kind === "dueDate" ? lastDue.dueDate : undefined,
						}),
					).catch(() => editor.setEditorState(before));
					pendingRef.current = Promise.all([pendingRef.current, request]).then(
						() => undefined,
					);
					editor.getEditorState().read(() => {
						const next = new Map<string, number>();
						for (const { match } of collectMatches(activeConfig)) {
							const key = signature(match);
							next.set(key, (next.get(key) ?? 0) + 1);
						}
						baselineRef.current = next;
					});
				},
			},
		);
		if (selected.length > 0) {
			const state = editor.getEditorState().toJSON();
			onContentCommittedRef.current?.({ root: state.root });
		}
		return selected.length > 0;
	};

	const commitAtCursor = () =>
		apply((all) => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection) || !selection.isCollapsed()) return [];
			const anchor = selection.anchor.getNode();
			if (!$isTextNode(anchor)) return [];
			for (const item of all) {
				const segment = item.run.segments.find(({ node }) => node === anchor);
				if (!segment) continue;
				const offset = segment.start + selection.anchor.offset;
				if (item.match.end === offset) return [item];
			}
			return [];
		});

	const commitNew = () =>
		apply((all) => {
			const seen = new Map<string, number>();
			return all.filter(({ match }) => {
				const key = signature(match);
				const count = (seen.get(key) ?? 0) + 1;
				seen.set(key, count);
				return count > (baselineRef.current.get(key) ?? 0);
			});
		});

	const saveAfterPending = (save: () => void) => {
		void pendingRef.current.then(save);
	};

	return { commitAtCursor, commitNew, saveAfterPending };
}
