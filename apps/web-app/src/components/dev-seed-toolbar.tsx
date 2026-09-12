import type { OutlineStore } from "@cascade/data";
import { textState } from "@cascade/data";
import { colors } from "@cascade/theme/tokens.stylex";
import { Dialog } from "@cascade/ui/dialog";
import { faker } from "@faker-js/faker";
import { FlowArrow, Plus, Stack, Trash } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { observer } from "mobx-react-lite";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	toolbar: {
		position: "fixed",
		bottom: 16,
		left: 16,
		zIndex: 50,
		display: "flex",
		alignItems: "center",
		gap: 2,
		borderRadius: 13,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "rgba(43, 45, 51, 0.08)",
		backgroundColor: colors.white,
		padding: 6,
		boxShadow: "0 18px 40px -12px rgba(43, 45, 51, 0.3)",
	},
	tag: {
		fontSize: "0.65rem",
		fontWeight: 700,
		letterSpacing: "0.04em",
		textTransform: "uppercase",
		color: colors.muted,
		paddingInline: 9,
	},
	divider: {
		width: 1,
		alignSelf: "stretch",
		backgroundColor: "rgba(43, 45, 51, 0.08)",
		marginBlock: 4,
	},
	button: {
		display: "flex",
		alignItems: "center",
		gap: 7,
		paddingBlock: 8,
		paddingInline: 11,
		borderRadius: 9,
		border: "none",
		backgroundColor: "transparent",
		fontSize: "0.85rem",
		fontFamily: "inherit",
		color: colors.ink,
		cursor: "default",
		":hover": {
			backgroundColor: colors.surface,
		},
		":disabled": {
			opacity: 0.4,
			cursor: "default",
			backgroundColor: "transparent",
		},
	},
	danger: {
		color: colors.danger,
	},
	icon: {
		display: "flex",
		color: colors.muted,
	},
	dangerIcon: {
		color: colors.danger,
	},
	dialogActions: {
		display: "flex",
		gap: 8,
	},
	cancelButton: {
		paddingBlock: 8,
		paddingInline: 14,
		borderRadius: 9,
		border: "none",
		backgroundColor: colors.surface,
		fontSize: "0.85rem",
		fontFamily: "inherit",
		color: colors.ink,
		cursor: "default",
	},
	confirmButton: {
		paddingBlock: 8,
		paddingInline: 14,
		borderRadius: 9,
		border: "none",
		backgroundColor: colors.danger,
		fontSize: "0.85rem",
		fontFamily: "inherit",
		fontWeight: 500,
		color: colors.white,
		cursor: "default",
	},
});

function seedNode(
	store: OutlineStore,
	parentId: string | null,
	depth: number,
): void {
	const id = store.create(parentId);
	store.setContent(id, textState(faker.lorem.sentence({ min: 3, max: 9 })));
	if (faker.datatype.boolean({ probability: 0.3 })) {
		store.setTask(id, { done: faker.datatype.boolean({ probability: 0.35 }) });
	}
	if (depth > 0 && faker.datatype.boolean({ probability: 0.55 })) {
		const childCount = faker.number.int({ min: 1, max: 4 });
		for (let i = 0; i < childCount; i++) {
			seedNode(store, id, depth - 1);
		}
	}
}

function seedFlat(store: OutlineStore, count: number): void {
	for (let i = 0; i < count; i++) {
		seedNode(store, null, 0);
	}
}

function seedTree(store: OutlineStore): void {
	const rootCount = faker.number.int({ min: 3, max: 6 });
	for (let i = 0; i < rootCount; i++) {
		seedNode(store, null, 2);
	}
}

export const DevSeedToolbar = observer(function DevSeedToolbar() {
	const store = useOutlineStore();
	const nodeCount = store.nodes.size;

	return (
		<div {...stylex.props(styles.toolbar)}>
			<span {...stylex.props(styles.tag)}>Dev seed</span>
			<div {...stylex.props(styles.divider)} />
			<button
				type="button"
				{...stylex.props(styles.button)}
				onClick={() => seedFlat(store, 1)}
			>
				<span {...stylex.props(styles.icon)}>
					<Plus size={15} />
				</span>
				Add one
			</button>
			<button
				type="button"
				{...stylex.props(styles.button)}
				onClick={() => seedFlat(store, 5)}
			>
				<span {...stylex.props(styles.icon)}>
					<Stack size={15} />
				</span>
				Add 5
			</button>
			<button
				type="button"
				{...stylex.props(styles.button)}
				onClick={() => seedTree(store)}
			>
				<span {...stylex.props(styles.icon)}>
					<FlowArrow size={15} />
				</span>
				Seed tree
			</button>
			<div {...stylex.props(styles.divider)} />
			<Dialog.Root>
				<Dialog.Trigger
					{...stylex.props(styles.button, styles.danger)}
					disabled={nodeCount === 0}
				>
					<span {...stylex.props(styles.icon, styles.dangerIcon)}>
						<Trash size={15} />
					</span>
					Delete all
				</Dialog.Trigger>
				<Dialog.Popup
					title="Delete all nodes?"
					description={`This will permanently remove all ${nodeCount} node${nodeCount === 1 ? "" : "s"} in the outline. This can't be undone.`}
					footer={
						<div {...stylex.props(styles.dialogActions)}>
							<Dialog.Close {...stylex.props(styles.cancelButton)}>
								Cancel
							</Dialog.Close>
							<Dialog.Close
								{...stylex.props(styles.confirmButton)}
								onClick={() => store.clearAll()}
							>
								Delete all
							</Dialog.Close>
						</div>
					}
				/>
			</Dialog.Root>
		</div>
	);
});
