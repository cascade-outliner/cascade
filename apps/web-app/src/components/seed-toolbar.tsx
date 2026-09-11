// TODO: This is a throwaway file, remove when we have a better way to seed the outline for dev purposes.

import { colors } from "@cascade/theme/tokens.stylex";
import { faker } from "@faker-js/faker";
import * as stylex from "@stylexjs/stylex";
import type { SerializedEditorState } from "lexical";
import { useState } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	row: {
		display: "flex",
		alignItems: "center",
		gap: 6,
		paddingBlock: 4,
		paddingInline: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: colors.accent,
		backgroundColor: "rgba(227, 139, 117, 0.08)",
		fontSize: "1rem",
		color: colors.muted,
	},
	label: {
		fontWeight: 600,
		letterSpacing: 0.5,
		textTransform: "uppercase",
		color: colors.accent,
		fontSize: "1rem",
	},
	input: {
		width: 128,
		paddingBlock: 3,
		paddingInline: 6,
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: colors.surface,
		backgroundColor: colors.white,
		color: colors.ink,
		fontSize: "1rem",
	},
	button: {
		paddingBlock: 3,
		paddingInline: 8,
		borderRadius: 6,
		borderWidth: 0,
		borderStyle: "none",
		backgroundColor: colors.accent,
		color: colors.canvas,
		fontSize: "1rem",
		cursor: "pointer",
	},
	clearButton: {
		paddingBlock: 3,
		paddingInline: 8,
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: colors.surface,
		backgroundColor: "transparent",
		color: colors.muted,
		fontSize: "1rem",
		cursor: "pointer",
	},
});

/** A Lexical state holding a single line of text. */
function textState(text: string): SerializedEditorState {
	return {
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text",
							version: 1,
						},
					],
					direction: null,
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: null,
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}

/** Dev-only helpers to bulk-seed and clear the outline. */
export function SeedToolbar() {
	const store = useOutlineStore();
	const [seedCount, setSeedCount] = useState(100);

	return (
		<div {...stylex.props(styles.row)}>
			<span {...stylex.props(styles.label)}>Dev</span>
			<input
				{...stylex.props(styles.input)}
				type="number"
				min={1}
				value={seedCount}
				onChange={(e) => setSeedCount(Number(e.target.value))}
			/>
			<button
				{...stylex.props(styles.button)}
				type="button"
				onClick={() => {
					for (let i = 0; i < seedCount; i++) {
						store.setContent(store.create(), textState(faker.lorem.sentence()));
					}
				}}
			>
				Seed nodes
			</button>
			<button
				{...stylex.props(styles.clearButton)}
				type="button"
				onClick={() => {
					for (const n of store.tree) store.remove(n.id);
				}}
			>
				Clear
			</button>
		</div>
	);
}
