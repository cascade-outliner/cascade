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
import { Dialog } from "../dialog/dialog.tsx";
import { LINK_ATTRIBUTES, normalizeUrl } from "./url.ts";

export const OPEN_LINK_DIALOG_COMMAND = createCommand<void>("OPEN_LINK_DIALOG");

const styles = stylex.create({
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

export function LinkDialogPlugin() {
	const [editor] = useLexicalComposerContext();
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [text, setText] = useState("");
	const [hasRange, setHasRange] = useState(false);
	const [invalid, setInvalid] = useState(false);
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
				$toggleLink(href, LINK_ATTRIBUTES);
				return;
			}
			const link = $createLinkNode(href, LINK_ATTRIBUTES);
			link.append($createTextNode(text.trim() || url.trim()));
			selection.insertNodes([link]);
			link.selectNext();
		});
		editor.focus();
	};

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Popup
				title="Add link"
				footer={
					<>
						<Dialog.Close render={<Button data-testid="link-dialog-cancel" />}>
							Cancel
						</Dialog.Close>
						<Button
							variant="primary"
							type="submit"
							form="link-dialog-form"
							data-testid="link-dialog-submit"
						>
							Save
						</Button>
					</>
				}
			>
				<form
					id="link-dialog-form"
					onSubmit={submit}
					{...stylex.props(styles.form)}
				>
					<label {...stylex.props(styles.field)}>
						URL
						<input
							data-testid="link-dialog-url"
							ref={(element) => element?.focus()}
							value={url}
							placeholder="https://example.com"
							onChange={(event) => {
								setUrl(event.target.value);
								setInvalid(false);
							}}
							{...stylex.props(styles.input)}
						/>
					</label>
					{!hasRange && (
						<label {...stylex.props(styles.field)}>
							Text
							<input
								data-testid="link-dialog-text"
								value={text}
								placeholder="Optional"
								onChange={(event) => setText(event.target.value)}
								{...stylex.props(styles.input)}
							/>
						</label>
					)}
					{invalid && (
						<p data-testid="link-dialog-error" {...stylex.props(styles.error)}>
							Enter a valid http, https or mailto link
						</p>
					)}
				</form>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
