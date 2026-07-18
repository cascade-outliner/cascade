import { cva } from "@cascade/ui/cva.config";
import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useState } from "react";
import { useOutlinerLabels } from "../../labels-context";
import { $isEditableLinkNode } from "./editable-link-node";
import { useLinkEditorContext } from "./link-editor-context";

interface EditableLinkViewProps {
	nodeKey: NodeKey;
	url: string;
	text: string;
	title: string | null;
}

const wrapper = cva({
	base: "inline-flex max-w-full items-center gap-0.5 align-baseline",
});

const trigger = cva({
	base: "min-w-0 truncate underline underline-offset-2 outline-none cursor-pointer",
});

const openIcon = cva({
	base: [
		"inline-flex shrink-0 items-center outline-none rounded-sm",
		"text-graphite/70 hover:text-redleather",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:text-ginger/50 dark:hover:text-redleather",
	],
});

const field = cva({
	base: [
		"w-full rounded-md border px-2 py-1.5 text-sm outline-none",
		"border-dark-grey/15 bg-transparent text-dark-grey",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
		"dark:border-ginger/20 dark:text-ginger",
	],
});

const openButton = cva({
	base: [
		"rounded-md px-3 py-1.5 text-sm outline-none cursor-pointer",
		"bg-redleather text-super-ginger hover:bg-redleather/90",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
	],
});

export function EditableLinkView({
	nodeKey,
	url,
	text,
	title,
}: EditableLinkViewProps) {
	const [editor] = useLexicalComposerContext();
	const { setLinkPopoverOpen, requestSave } = useLinkEditorContext();
	const labels = useOutlinerLabels();
	const [open, setOpen] = useState(false);
	const [draftTitle, setDraftTitle] = useState(text);
	const [draftUrl, setDraftUrl] = useState(url);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		setLinkPopoverOpen(nextOpen);
		if (nextOpen) {
			setDraftTitle(text);
			setDraftUrl(url);
		} else {
			requestSave();
		}
	};

	const updateNode = (nextTitle: string, nextUrl: string) => {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if (!$isEditableLinkNode(node)) return;
			node.setLinkText(nextTitle);
			node.setURL(nextUrl);
		});
	};

	return (
		<span className={wrapper()}>
			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger
					className={trigger()}
					aria-label={labels.linkEditAria}
					onClick={(event) => event.stopPropagation()}
				>
					{text}
				</PopoverTrigger>
				<PopoverContent className="w-72">
					<div className="flex flex-col gap-3">
						<label className="flex flex-col gap-1 text-left text-sm">
							<span className="font-medium">{labels.linkTitleLabel}</span>
							<input
								value={draftTitle}
								className={field()}
								onChange={(event) => {
									setDraftTitle(event.target.value);
									updateNode(event.target.value, draftUrl);
								}}
							/>
						</label>
						<label className="flex flex-col gap-1 text-left text-sm">
							<span className="font-medium">{labels.linkUrlLabel}</span>
							<input
								value={draftUrl}
								className={field()}
								onChange={(event) => {
									setDraftUrl(event.target.value);
									updateNode(draftTitle, event.target.value);
								}}
							/>
						</label>
						<div className="flex justify-end">
							<a
								href={draftUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={openButton()}
							>
								{labels.linkOpen}
							</a>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			<a
				href={url}
				title={title ?? url}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={labels.linkOpenAria}
				className={openIcon()}
				onClick={(event) => event.stopPropagation()}
			>
				<ArrowSquareOutIcon size="1em" weight="bold" />
			</a>
		</span>
	);
}
