import { Dialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import { CircleNotchIcon, TrashIcon, XIcon } from "@phosphor-icons/react/ssr";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useState } from "react";
import DiffViewer from "react-diff-viewer-continued";
import { useOutlinerLabels } from "../../labels-context";
import { lexicalToPlainText } from "../../lexical/lexical-content";
import {
	dialogBackdrop,
	dialogPopup,
	dialogTitle,
	diffPane,
	diffPaneHeader,
	emptyState,
	iconButton,
	listPane,
	listRow,
	versionTimestamp,
} from "./styles";

export interface NodeVersionSummary {
	id: string;
	content: unknown;
	createdAt: Date;
	/** The owning node's *current* content — not this version's. Used both
	 * to diff every entry against "what's there now" (so the diff shows
	 * exactly what a restore would change) and, in tree-wide history, as
	 * the link's title. */
	nodeContent: unknown;
	/** Present only for tree-wide history, to link back to the node.
	 * Omitted for the single-node view, which has no need for a link back
	 * to the node it's already open on. */
	nodeId?: string;
	/** Set when the owning node is currently deleted. Its `node_versions`
	 * survive a delete on purpose, so its history — and the ability to
	 * restore it, bringing the whole subtree back — isn't lost along with
	 * it; restoring one of its versions is how you undelete it. */
	nodeDeletedAt?: Date | null;
}

export interface NodeVersionHistoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Overrides the dialog title; defaults to the single-node label. */
	title?: string;
	/** Overrides the close button's aria-label; defaults to the single-node label. */
	closeAriaLabel?: string;
	/** Overrides the empty-state message; defaults to the single-node label. */
	emptyLabel?: string;
	/** Replaces the version list/loading/empty states with arbitrary
	 * content, e.g. an upsell notice when the viewer doesn't have access
	 * to this feature. Leave unset to render the normal `versions` flow. */
	locked?: ReactNode;
	/** `undefined` while the list is loading. Ignored when `locked` is set. */
	versions?: NodeVersionSummary[];
	onRestore: (versionId: string) => void;
	/** The version currently being restored, if any (disables its button). */
	restoringId?: string | null;
	/** Renders a link to a version's owning node. Required for tree-wide
	 * history (where `versions` entries carry `nodeId`); unused otherwise. */
	renderNodeLink?: (node: { id: string; content: unknown }) => ReactNode;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

/** `react-diff-viewer-continued` themes itself via a JS prop rather than
 * Tailwind's `dark:` variant, so it needs the app's actual dark-mode state
 * (driven by a `dark` class on `<html>`, toggled by user settings — see
 * `apps/app/src/routes/__root.tsx` — not just OS preference) read out of
 * the DOM directly. */
function useIsDarkMode(): boolean {
	const [isDark, setIsDark] = useState(
		() =>
			typeof document !== "undefined" &&
			document.documentElement.classList.contains("dark"),
	);

	useEffect(() => {
		const root = document.documentElement;
		const observer = new MutationObserver(() =>
			setIsDark(root.classList.contains("dark")),
		);
		observer.observe(root, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	return isDark;
}

export function NodeVersionHistoryDialog({
	open,
	onOpenChange,
	title,
	closeAriaLabel,
	emptyLabel,
	locked,
	versions,
	onRestore,
	restoringId,
	renderNodeLink,
}: NodeVersionHistoryDialogProps) {
	const labels = useOutlinerLabels();
	const isDarkMode = useIsDarkMode();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	// A ref callback stored in state (rather than `useRef`) so mounting the
	// scroll container — which only happens once `versions` finishes loading
	// — triggers a re-render with the real element, instead of the
	// virtualizer's first measurement silently seeing a still-null `.current`
	// and never being prompted to look again.
	const [listScrollEl, setListScrollEl] = useState<HTMLDivElement | null>(null);

	// Falls back to the newest entry whenever there's no selection yet, or
	// the previously-selected id no longer exists in the current list (e.g.
	// switching which node's history is open, or a stale id after a
	// restore) — computed during render so there's no flash of "nothing
	// selected" while an effect catches up.
	const selected =
		versions?.find((v) => v.id === selectedId) ?? versions?.[0] ?? null;

	// Tree-wide history can list a version for every edit across every node,
	// so the left index is virtualized the same way the outline itself is
	// (see `use-tree-interactions.ts`): only the rows actually on screen are
	// mounted, regardless of how long the list gets. Rows are a fixed height
	// within a given dialog (tree-wide rows carry an extra node-link line,
	// single-node ones don't, but that's uniform across one open dialog).
	const virtualizer = useVirtualizer({
		count: versions?.length ?? 0,
		getScrollElement: () => listScrollEl,
		estimateSize: () => (renderNodeLink ? 64 : 46),
		overscan: 8,
		getItemKey: (index) => versions?.[index]?.id ?? index,
	});

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdrop()} />
				<Dialog.Popup className={dialogPopup()}>
					<div className="flex shrink-0 items-center justify-between border-ink/10 border-b p-4 dark:border-surface/15">
						<Dialog.Title className={dialogTitle()}>
							{title ?? labels.versionHistory}
						</Dialog.Title>
						<Dialog.Close
							aria-label={closeAriaLabel ?? labels.versionHistoryCloseAria}
							className={iconButton()}
						>
							<XIcon size={16} weight="bold" />
						</Dialog.Close>
					</div>
					{locked ? (
						<div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
							{locked}
						</div>
					) : versions === undefined ? (
						<div className="flex flex-1 items-center justify-center">
							<CircleNotchIcon
								size={24}
								className="animate-spin text-danger dark:text-accent"
							/>
						</div>
					) : versions.length === 0 ? (
						<div className="flex flex-1 items-center justify-center">
							<p className={emptyState()}>
								{emptyLabel ?? labels.versionHistoryEmpty}
							</p>
						</div>
					) : (
						<div className="flex min-h-0 flex-1">
							<div ref={setListScrollEl} className={listPane()}>
								<div
									style={{
										height: virtualizer.getTotalSize(),
										position: "relative",
									}}
								>
									{virtualizer.getVirtualItems().map((virtualItem) => {
										const version = versions[virtualItem.index];
										if (!version) return null;
										const timestamp = timestampFormatter.format(
											version.createdAt,
										);
										return (
											<div
												key={virtualItem.key}
												ref={virtualizer.measureElement}
												data-index={virtualItem.index}
												className={listRow({
													selected: version.id === selected?.id,
												})}
												style={{
													transform: `translateY(${virtualItem.start}px)`,
												}}
											>
												{/* The whole row selects this version, but a real
												 * <button> can't contain the <a> that renderNodeLink
												 * renders (invalid nesting of interactive content).
												 * So selection is a full-row overlay button instead:
												 * the link (and the plain timestamp text, via
												 * pointer-events-none) sit visually on top of it via
												 * z-index and remain independently clickable — the
												 * browser hit-tests whichever sits on top at the
												 * clicked point, so there's no double-firing. */}
												<button
													type="button"
													aria-label={timestamp}
													onClick={() => setSelectedId(version.id)}
													className="absolute inset-0 cursor-pointer bg-transparent outline-none"
												/>
												<span
													className={`${versionTimestamp()} relative z-10 select-none pointer-events-none`}
												>
													{timestamp}
												</span>
												{version.nodeId !== undefined &&
													(version.nodeDeletedAt ? (
														<span className="relative z-10 flex items-center gap-1 truncate text-danger text-xs dark:text-accent">
															<TrashIcon size={11} weight="bold" />
															{labels.versionHistoryDeletedBadge}
														</span>
													) : (
														renderNodeLink && (
															<span className="relative z-10 truncate text-xs">
																{renderNodeLink({
																	id: version.nodeId,
																	content: version.nodeContent,
																})}
															</span>
														)
													))}
											</div>
										);
									})}
								</div>
							</div>
							{selected && (
								<div className={diffPane()}>
									<div className={diffPaneHeader()}>
										<div className="flex min-w-0 items-center gap-2">
											<span className={versionTimestamp()}>
												{timestampFormatter.format(selected.createdAt)}
											</span>
											{selected.nodeDeletedAt && (
												<span className="flex shrink-0 items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-danger text-xs dark:bg-accent/15 dark:text-accent">
													<TrashIcon size={11} weight="bold" />
													{labels.versionHistoryDeletedBadge}
												</span>
											)}
										</div>
										<Button
											type="button"
											size="sm"
											onClick={() => onRestore(selected.id)}
											disabled={restoringId === selected.id}
										>
											{labels.versionHistoryRestore}
										</Button>
									</div>
									<div className="min-h-0 flex-1 overflow-auto rounded-md border border-ink/10 dark:border-surface/15">
										<DiffViewer
											key={selected.id}
											oldValue={lexicalToPlainText(selected.content)}
											newValue={lexicalToPlainText(selected.nodeContent)}
											// Unified rather than side-by-side: the removed
											// (before) line stacks directly above the added
											// (after) one, which reads better for short prose
											// than two side-by-side columns.
											splitView={false}
											hideLineNumbers
											hideSummary
											useDarkTheme={isDarkMode}
										/>
									</div>
								</div>
							)}
						</div>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
