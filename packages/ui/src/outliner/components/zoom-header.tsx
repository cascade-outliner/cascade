import type { Node } from "@cascade/data";
import { css } from "@cascade/theme/css";
import type { EditorState } from "lexical";
import { ItemContext } from "../context.tsx";
import { Content } from "./content.tsx";

const styles = {
	heading: css({
		margin: "0",
		font: "inherit",
	}),
	title: css.raw({
		fontSize: "800",
		fontWeight: 600,
		letterSpacing: "-0.02em",
	}),
};

export interface ZoomHeaderProps {
	/** The node currently zoomed into. */
	node: Node;
	onChange?: (state: EditorState) => void;
	/** Show the title without letting it be edited. */
	readOnly?: boolean;
	/** Display text for the node in place of its content, or `undefined` to show the content. */
	labelOf?: (node: Node) => string | undefined;
	/** View transition name for the title, so it can morph from the zoomed row. */
	titleTransitionName?: string;
}

export function ZoomHeader({
	node,
	onChange,
	readOnly,
	labelOf,
	titleTransitionName,
}: ZoomHeaderProps) {
	return (
		<ItemContext.Provider value={{ node, depth: 0 }}>
			<h1
				className={styles.heading}
				style={{ viewTransitionName: titleTransitionName }}
			>
				<Content
					key={node.id}
					css={styles.title}
					label={labelOf?.(node)}
					editable={!readOnly}
					onChange={onChange}
				/>
			</h1>
		</ItemContext.Provider>
	);
}
