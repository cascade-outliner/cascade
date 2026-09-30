import {
	colors,
	fontSize,
	radius,
	shadow,
	space,
} from "@cascade/theme/tokens.stylex";
import { $createLinkNode, $isLinkNode, $toggleLink } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import * as stylex from "@stylexjs/stylex";
import {
	$createTextNode,
	$getSelection,
	$isRangeSelection,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_LOW,
	createCommand,
} from "lexical";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../button/button.tsx";
import { Popover } from "../popover/popover.tsx";
import { linkAttributes, normalizeUrl } from "./url.ts";

export const OPEN_LINK_DIALOG_COMMAND = createCommand<void>("OPEN_LINK_DIALOG");

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
	field: {
		display: "flex",
		flexDirection: "column",
		gap: space["1"],
		fontSize: fontSize["300"],
		color: colors.muted,
	},
	input: {
		padding: space["2"],
		border: "none",
		borderRadius: radius.md,
		backgroundColor: colors.white,
		boxShadow: {
			default: `inset 0 0 0 1px ${colors.borderStrong}`,
			":focus": shadow.focusRing,
		},
		outline: "none",
		font: "inherit",
		fontSize: fontSize["500"],
		color: colors.ink,
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
	const saved = useRef<BaseSelection | null>(null);

	useEffect(
		() =>
			editor.registerCommand(
				OPEN_LINK_DIALOG_COMMAND,
				() => {
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

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Popup
				anchor={anchor}
				label="Add link"
				initialFocus={urlInput}
				style={styles.popup}
			>
				<form onSubmit={submit} {...stylex.props(styles.form)}>
					<input
						ref={urlInput}
						data-testid="link-dialog-url"
						aria-label="URL"
						value={url}
						placeholder="Paste or type a link"
						onChange={(event) => {
							setUrl(event.target.value);
							setInvalid(false);
						}}
						{...stylex.props(styles.input)}
					/>
					{!hasRange && (
						<input
							data-testid="link-dialog-text"
							aria-label="Text"
							value={text}
							placeholder="Text (optional)"
							onChange={(event) => setText(event.target.value)}
							{...stylex.props(styles.input)}
						/>
					)}
					{invalid && (
						<p data-testid="link-dialog-error" {...stylex.props(styles.error)}>
							Enter a valid http, https or mailto link
						</p>
					)}
					<div {...stylex.props(styles.footer)}>
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
