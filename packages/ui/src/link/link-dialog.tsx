import { colors, fontSize, space } from "@cascade/theme/tokens.stylex";
import {
	$createLinkNode,
	$isAutoLinkNode,
	$isLinkNode,
	$toggleLink,
	type LinkNode,
} from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import * as stylex from "@stylexjs/stylex";
import {
	$createTextNode,
	$getNearestNodeFromDOMNode,
	$getNodeByKey,
	$getSelection,
	$isRangeSelection,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_LOW,
	createCommand,
} from "lexical";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../button/button.tsx";
import { Field } from "../field/field.tsx";
import { Popover } from "../popover/popover.tsx";
import { linkAttributes, normalizeUrl } from "./url.ts";

export const OPEN_LINK_DIALOG_COMMAND = createCommand<HTMLElement | undefined>(
	"OPEN_LINK_DIALOG",
);

const styles = stylex.create({
	popup: { width: 300, maxWidth: "calc(100vw - 32px)" },
	footer: {
		display: "flex",
		justifyContent: "flex-end",
		gap: space["2"],
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: space["3"],
	},
	error: {
		margin: 0,
		fontSize: fontSize["300"],
		color: colors.danger,
	},
});

interface VirtualElement {
	getBoundingClientRect: () => DOMRect;
}

function caretRect(root: HTMLElement | null): DOMRect {
	const selection = window.getSelection();
	if (selection && selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
		if (rect.height > 0 && root?.contains(range.startContainer)) return rect;
	}
	return (root ?? document.body).getBoundingClientRect();
}

export function LinkDialogPlugin() {
	const [editor] = useLexicalComposerContext();
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [text, setText] = useState("");
	const [hasRange, setHasRange] = useState(false);
	const [invalid, setInvalid] = useState(false);
	const [anchor, setAnchor] = useState<VirtualElement | null>(null);
	const urlInput = useRef<HTMLInputElement>(null);
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const saved = useRef<BaseSelection | null>(null);

	useEffect(
		() =>
			editor.registerCommand(
				OPEN_LINK_DIALOG_COMMAND,
				(target) => {
					const node = target ? $getNearestNodeFromDOMNode(target) : null;
					const clicked = node
						? $isLinkNode(node)
							? node
							: $findMatchingParent(node, $isLinkNode)
						: null;
					if (target && clicked) {
						const rect =
							target.getClientRects()[0] ?? target.getBoundingClientRect();
						saved.current = null;
						setEditingKey(clicked.getKey());
						setUrl(clicked.getURL());
						setText(clicked.getTextContent());
						setHasRange(false);
						setInvalid(false);
						setAnchor({ getBoundingClientRect: () => rect });
						setOpen(true);
						return true;
					}
					setEditingKey(null);
					const selection = $getSelection();
					saved.current = selection?.clone() ?? null;
					let existing = "";
					let range = false;
					if ($isRangeSelection(selection)) {
						range = !selection.isCollapsed();
						const link = $findMatchingParent(
							selection.anchor.getNode(),
							$isLinkNode,
						);
						if (link) existing = link.getURL();
					}
					setUrl(existing);
					setText("");
					setHasRange(range);
					setInvalid(false);
					const caret = caretRect(editor.getRootElement());
					setAnchor({ getBoundingClientRect: () => caret });
					setOpen(true);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		[editor],
	);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const href = normalizeUrl(url);
		if (!href) {
			setInvalid(true);
			return;
		}
		setOpen(false);
		editor.update(() => {
			if (editingKey) {
				const existing = $getNodeByKey<LinkNode>(editingKey);
				if (!existing) return;
				const label = text.trim() || href;
				const link = $createLinkNode(href, linkAttributes(href, label));
				link.append($createTextNode(label));
				existing.replace(link);
				link.selectEnd();
				return;
			}
			if (saved.current) $setSelection(saved.current.clone());
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;
			if (!selection.isCollapsed()) {
				$toggleLink(href, linkAttributes(href, selection.getTextContent()));
				return;
			}
			const label = text.trim();
			const link = $createLinkNode(href, linkAttributes(href, label));
			link.append($createTextNode(label || url.trim()));
			selection.insertNodes([link]);
			link.selectNext();
		});
		editor.focus();
	};

	const remove = () => {
		setOpen(false);
		editor.update(() => {
			if (!editingKey) return;
			const existing = $getNodeByKey<LinkNode>(editingKey);
			if (!existing) return;
			if ($isAutoLinkNode(existing)) {
				existing.setIsUnlinked(true);
				return;
			}
			for (const child of existing.getChildren()) existing.insertBefore(child);
			existing.remove();
		});
		editor.focus();
	};

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Popup
				anchor={anchor}
				label={editingKey ? "Edit link" : "Add link"}
				initialFocus={urlInput}
				style={styles.popup}
			>
				<form onSubmit={submit} {...stylex.props(styles.form)}>
					<Field
						label="URL"
						ref={urlInput}
						data-testid="link-dialog-url"
						value={url}
						placeholder="Paste or type a link"
						onChange={(event) => {
							setUrl(event.target.value);
							setInvalid(false);
						}}
					/>
					{!hasRange && (
						<Field
							label="Text"
							data-testid="link-dialog-text"
							value={text}
							placeholder="Text (optional)"
							onChange={(event) => setText(event.target.value)}
						/>
					)}
					{invalid && (
						<p data-testid="link-dialog-error" {...stylex.props(styles.error)}>
							Enter a valid http, https or mailto link
						</p>
					)}
					<div {...stylex.props(styles.footer)}>
						{editingKey && (
							<Button
								size="small"
								data-testid="link-dialog-remove"
								onClick={remove}
							>
								Remove
							</Button>
						)}
						<Popover.Close
							render={<Button size="small" data-testid="link-dialog-cancel" />}
						>
							Cancel
						</Popover.Close>
						<Button
							size="small"
							variant="primary"
							type="submit"
							data-testid="link-dialog-submit"
						>
							Save
						</Button>
					</div>
				</form>
			</Popover.Popup>
		</Popover.Root>
	);
}
