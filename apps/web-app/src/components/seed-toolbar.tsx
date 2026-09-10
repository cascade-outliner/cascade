// TODO: This is a throwaway file, remove when we have a better way to seed the outline for dev purposes.

import { faker } from "@faker-js/faker";
import * as stylex from "@stylexjs/stylex";
import type { SerializedEditorState } from "lexical";
import { useState } from "react";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	row: {
		display: "flex",
		alignItems: "center",
		gap: 4,
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
			<input
				type="number"
				min={1}
				value={seedCount}
				onChange={(e) => setSeedCount(Number(e.target.value))}
			/>
			<button
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
