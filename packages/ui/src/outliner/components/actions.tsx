import { Menu } from "@base-ui/react/menu";
import { colors } from "@cascade/theme/tokens.stylex";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { TextIndentIcon } from "@phosphor-icons/react/dist/ssr/TextIndent";
import { TextOutdentIcon } from "@phosphor-icons/react/dist/ssr/TextOutdent";
import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr/TrashSimple";
import * as stylex from "@stylexjs/stylex";
import { useItem } from "../context";
import { rowVars } from "../vars.stylex";

const inkTint20 = `color-mix(in oklab, ${colors.ink} 20%, transparent)`;
const inkTint10 = `color-mix(in oklab, ${colors.ink} 10%, transparent)`;
const dangerTint10 = `color-mix(in oklab, ${colors.danger} 10%, transparent)`;

const styles = stylex.create({
	trigger: {
		position: "absolute",
		right: "100%",
		top: "50%",
		transform: "translateY(-50%)",
		display: "inline-flex",
		width: 18,
		height: 18,
		flexShrink: 0,
		cursor: "pointer",
		userSelect: "none",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 9999,
		padding: 0,
		color: {
			default: colors.muted,
			":hover": colors.ink,
			":is([data-popup-open])": colors.ink,
		},
		backgroundColor: {
			default: "transparent",
			":hover": inkTint20,
			":is([data-popup-open])": inkTint20,
		},
		opacity: {
			default: rowVars.actionsOpacity,
			":focus-visible": 1,
			":is([data-popup-open])": 1,
		},
	},
	popup: {
		minWidth: 144,
		transformOrigin: "var(--transform-origin)",
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: inkTint10,
		backgroundColor: "#fff",
		padding: 4,
		boxShadow:
			"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
		outline: "none",
		transitionProperty: "transform, opacity",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transform: {
			default: null,
			":is([data-starting-style], [data-ending-style])": "scale(0.95)",
		},
		opacity: {
			default: 1,
			":is([data-starting-style], [data-ending-style])": 0,
		},
	},
	item: {
		display: "flex",
		cursor: "pointer",
		userSelect: "none",
		alignItems: "center",
		gap: 8,
		borderRadius: 6,
		paddingInline: 8,
		paddingBlock: 6,
		fontSize: 14,
		lineHeight: "20px",
		outline: "none",
		backgroundColor: {
			default: "transparent",
			":is([data-highlighted])": inkTint10,
		},
	},
	deleteItem: {
		color: colors.danger,
		backgroundColor: {
			default: "transparent",
			":is([data-highlighted])": dangerTint10,
		},
	},
});

export function Actions({
	style,
	previousSiblingId,
	parentId,
	grandParentId,
	onDelete,
	onIndent,
	onOutdent,
}: {
	style?: stylex.StyleXStyles;
	previousSiblingId?: string;
	parentId?: string;
	grandParentId?: string;
	onDelete?: (id: string) => void;
	onIndent?: (id: string, previousSiblingId: string) => void;
	onOutdent?: (id: string, newParentId: string | null) => void;
}) {
	const { node } = useItem();

	return (
		<Menu.Root>
			<Menu.Trigger {...stylex.props(styles.trigger, style)}>
				<DotsThreeIcon size={14} weight="bold" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner sideOffset={8} align="end">
					<Menu.Popup {...stylex.props(styles.popup)}>
						{onIndent && (
							<Menu.Item
								{...stylex.props(styles.item)}
								disabled={!previousSiblingId}
								onClick={() =>
									previousSiblingId && onIndent(node.id, previousSiblingId)
								}
							>
								<TextIndentIcon size={14} weight="bold" />
								Indent
							</Menu.Item>
						)}
						{onOutdent && (
							<Menu.Item
								{...stylex.props(styles.item)}
								disabled={!parentId}
								onClick={() =>
									parentId && onOutdent(node.id, grandParentId ?? null)
								}
							>
								<TextOutdentIcon size={14} weight="bold" />
								Outdent
							</Menu.Item>
						)}
						<Menu.Item
							{...stylex.props(styles.item, styles.deleteItem)}
							onClick={() => onDelete?.(node.id)}
						>
							<TrashSimpleIcon size={14} weight="bold" />
							Delete
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
