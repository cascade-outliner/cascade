import { AutoLinkNode, LinkNode } from "@lexical/link";
import {
	AutoLinkPlugin,
	createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HeadingNode } from "@lexical/rich-text";
import type { FocusPoint } from "../../model/focus-point";
import { HEADING_CLASSES } from "../model/heading-styles";
import type { LexicalElementNode } from "../model/lexical-node.types";
import { TableGridNode } from "../table/table-node";
import { EditableContent } from "./editable-content";
import { MARKDOWN_SHORTCUT_TRANSFORMERS } from "./markdown-shortcuts";

// Same shape as Lexical's playground URL matcher: http(s) URLs plus bare
// `www.` ones, which get an https:// scheme so they satisfy the server's
// http(s)-only allowlist for stored link URLs.
const URL_REGEX =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const LINK_MATCHERS = [
	createLinkMatcherWithRegExp(URL_REGEX, (text) =>
		text.startsWith("http") ? text : `https://${text}`,
	),
];

export interface LexicalEditViewProps {
	id: string;
	content: { root: LexicalElementNode } | null;
	focusPoint: FocusPoint | null;
	onSave: (content: { root: LexicalElementNode }) => void;
	onExit?: () => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
}

export function LexicalEditView({
	id,
	content,
	focusPoint,
	onSave,
	onExit,
	onCreateBelow,
	onDeleteEmpty,
	onIndent,
	onOutdent,
	onFocusNext,
	onFocusPrevious,
}: LexicalEditViewProps) {
	return (
		<LexicalComposer
			initialConfig={{
				namespace: `node-editor-${id}`,
				nodes: [LinkNode, AutoLinkNode, HeadingNode, TableGridNode],
				theme: {
					heading: HEADING_CLASSES,
					link: "text-danger underline decoration-danger/40 underline-offset-2 dark:text-accent dark:decoration-accent/40",
				},
				onError: (error) => console.error("lexical error", error),
				editorState: content ? JSON.stringify(content) : null,
			}}
		>
			<AutoLinkPlugin matchers={LINK_MATCHERS} />
			<MarkdownShortcutPlugin transformers={MARKDOWN_SHORTCUT_TRANSFORMERS} />
			<EditableContent
				focusPoint={focusPoint}
				onSave={onSave}
				onExit={onExit}
				onCreateBelow={onCreateBelow}
				onDeleteEmpty={onDeleteEmpty}
				onIndent={onIndent}
				onOutdent={onOutdent}
				onFocusNext={onFocusNext}
				onFocusPrevious={onFocusPrevious}
			/>
		</LexicalComposer>
	);
}
