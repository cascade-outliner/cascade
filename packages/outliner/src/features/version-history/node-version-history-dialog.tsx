import { Dialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import { cva } from "@cascade/ui/cva.config";
import {
	CaretRightIcon,
	CircleNotchIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { type ReactNode, useState } from "react";
import { useOutlinerLabels } from "../../labels-context";
import { toLexicalContent } from "../../lexical/lexical-content";
import { LexicalReadView } from "../../lexical/read/lexical-read-view";
import {
	dialogBackdrop,
	dialogPopup,
	dialogTitle,
	emptyState,
	iconButton,
	versionPreview,
	versionRow,
	versionRowHeader,
	versionTimestamp,
} from "./styles";

export interface NodeVersionSummary {
	id: string;
	content: unknown;
	createdAt: Date;
}

export interface NodeVersionHistoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Replaces the version list/loading/empty states with arbitrary
	 * content, e.g. an upsell notice when the viewer doesn't have access
	 * to this feature. Leave unset to render the normal `versions` flow. */
	locked?: ReactNode;
	/** `undefined` while the list is loading. Ignored when `locked` is set. */
	versions?: NodeVersionSummary[];
	onRestore: (versionId: string) => void;
	/** The version currently being restored, if any (disables its button). */
	restoringId?: string | null;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

const caret = cva({
	base: "shrink-0",
	variants: {
		expanded: {
			true: "rotate-90",
			false: "",
		},
	},
});

export function NodeVersionHistoryDialog({
	open,
	onOpenChange,
	locked,
	versions,
	onRestore,
	restoringId,
}: NodeVersionHistoryDialogProps) {
	const labels = useOutlinerLabels();
	const [expandedId, setExpandedId] = useState<string | null>(null);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdrop()} />
				<Dialog.Popup className={dialogPopup()}>
					<div className="mb-4 flex items-center justify-between">
						<Dialog.Title className={dialogTitle()}>
							{labels.versionHistory}
						</Dialog.Title>
						<Dialog.Close
							aria-label={labels.versionHistoryCloseAria}
							className={iconButton()}
						>
							<XIcon size={16} weight="bold" />
						</Dialog.Close>
					</div>
					{locked ? (
						locked
					) : versions === undefined ? (
						<div className="flex justify-center py-8">
							<CircleNotchIcon
								size={24}
								className="animate-spin text-danger dark:text-accent"
							/>
						</div>
					) : versions.length === 0 ? (
						<p className={emptyState()}>{labels.versionHistoryEmpty}</p>
					) : (
						<div className="flex flex-col gap-2">
							{versions.map((version) => {
								const isExpanded = expandedId === version.id;
								return (
									<div key={version.id} className={versionRow()}>
										<div className={versionRowHeader()}>
											<button
												type="button"
												className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
												onClick={() =>
													setExpandedId(isExpanded ? null : version.id)
												}
												aria-expanded={isExpanded}
											>
												<CaretRightIcon
													size={12}
													weight="bold"
													className={caret({ expanded: isExpanded })}
												/>
												<span className={versionTimestamp()}>
													{timestampFormatter.format(version.createdAt)}
												</span>
											</button>
											<Button
												type="button"
												size="sm"
												onClick={() => onRestore(version.id)}
												disabled={restoringId === version.id}
											>
												{labels.versionHistoryRestore}
											</Button>
										</div>
										{isExpanded && (
											<div className={versionPreview()}>
												<LexicalReadView
													content={toLexicalContent(version.content)}
												/>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
