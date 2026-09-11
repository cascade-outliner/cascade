import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { colors } from "@cascade/theme/tokens.stylex";
import { CheckSquare, Trash } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	trigger: {
		display: "contents",
	},
	positioner: {
		outline: "none",
	},
	popup: {
		minWidth: 190,
		borderRadius: 10,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "rgba(43, 45, 51, 0.08)",
		backgroundColor: colors.white,
		paddingBlock: 6,
		boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.18)",
		outline: "none",
	},
	item: {
		display: "flex",
		alignItems: "center",
		gap: 9,
		paddingBlock: 7,
		paddingInline: 12,
		fontSize: "0.9rem",
		color: colors.ink,
		cursor: "default",
		outline: "none",
		"[data-highlighted]": {
			backgroundColor: colors.surface,
		},
	},
	danger: {
		color: colors.danger,
	},
});

export interface OutlinerContextMenuProps {
	children: React.ReactNode;
	onDelete?: () => void;
	onConvertToTask?: () => void;
}

export function OutlinerContextMenu({
	children,
	onDelete,
	onConvertToTask,
}: OutlinerContextMenuProps) {
	return (
		<BaseContextMenu.Root>
			<BaseContextMenu.Trigger {...stylex.props(styles.trigger)}>
				{children}
			</BaseContextMenu.Trigger>
			<BaseContextMenu.Portal>
				<BaseContextMenu.Positioner {...stylex.props(styles.positioner)}>
					<BaseContextMenu.Popup {...stylex.props(styles.popup)}>
						<BaseContextMenu.Item
							{...stylex.props(styles.item)}
							onClick={onConvertToTask}
						>
							<CheckSquare size={15} />
							Convert to Task
						</BaseContextMenu.Item>
						<BaseContextMenu.Item
							{...stylex.props(styles.item, styles.danger)}
							onClick={onDelete}
						>
							<Trash size={15} />
							Delete
						</BaseContextMenu.Item>
					</BaseContextMenu.Popup>
				</BaseContextMenu.Positioner>
			</BaseContextMenu.Portal>
		</BaseContextMenu.Root>
	);
}
