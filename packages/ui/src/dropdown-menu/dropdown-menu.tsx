import { Menu as Base } from "@base-ui/react/menu";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	positioner: { zIndex: zIndex.overlay, outline: "none" },
	popup: {
		minWidth: 160,
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		padding: space["1.5"],
		boxShadow: shadow.popup,
		outline: "none",
	},
	item: {
		display: "flex",
		alignItems: "center",
		gap: space["3"],
		paddingBlock: { default: space["2"], "@media (hover: none)": space["3"] },
		paddingInline: space["3"],
		borderRadius: radius.md,
		fontSize: fontSize["500"],
		color: colors.ink,
		cursor: "default",
		outline: "none",
		"[data-highlighted]": { backgroundColor: colors.surface },
	},
	label: {
		paddingBlock: space["2"],
		paddingInline: space["3"],
		fontSize: fontSize["300"],
		color: colors.muted,
	},
});

function Popup({ children }: { children: React.ReactNode }) {
	return (
		<Base.Portal>
			<Base.Positioner
				{...stylex.props(styles.positioner)}
				align="end"
				sideOffset={4}
			>
				<Base.Popup {...stylex.props(styles.popup)}>{children}</Base.Popup>
			</Base.Positioner>
		</Base.Portal>
	);
}

function Item({
	icon,
	onClick,
	children,
}: {
	icon?: React.ReactNode;
	onClick?: () => void;
	children: React.ReactNode;
}) {
	return (
		<Base.Item {...stylex.props(styles.item)} onClick={onClick}>
			{icon}
			{children}
		</Base.Item>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	return <div {...stylex.props(styles.label)}>{children}</div>;
}

/** A click-to-open menu. `Trigger` takes a `render` element, e.g. `<Menu.Trigger render={<button />} />`. */
export const DropdownMenu = {
	Root: Base.Root,
	Trigger: Base.Trigger,
	Popup,
	Item,
	Label,
};
