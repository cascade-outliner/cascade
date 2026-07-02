import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "#/orpc/client";
import type { LexicalEditViewProps } from "#/ui/Lexical/Edit/lexical-edit-view";
import type { LexicalElementNode } from "#/ui/Lexical/Read/lexical-read-view";

export function EditableContent({
	id,
	parentId,
	onExit,
}: Pick<LexicalEditViewProps, "id" | "parentId" | "onExit">) {
	const [editor] = useLexicalComposerContext();
	const queryClient = useQueryClient();
	const { mutate } = useMutation({
		...orpc.updateNodeContent.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.listNodes.queryOptions({ input: { parentId } }),
			);
		},
	});

	return (
		<RichTextPlugin
			contentEditable={
				<ContentEditable
					onBlur={() => {
						const { root } = editor.getEditorState().toJSON();
						mutate({ id, content: { root: root as LexicalElementNode } });
						onExit?.();
					}}
				/>
			}
			placeholder={null}
			ErrorBoundary={({ children }) => children}
		/>
	);
}
