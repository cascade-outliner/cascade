import { ContextMenu as Base } from "@base-ui/react/context-menu";
import {
	borderWidth,
	colors,
	fontSize,
	opacity,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Kbd, KbdGroup } from "../kbd/kdb";

const styles = stylex.create({
	trigger: {
		display: "contents",
	},
	positioner: {
		zIndex: zIndex.overlay,
		outline: "none",
	},
	popup: {
		minWidth: 200,
		maxWidth: "calc(100vw - 32px)",
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
		"[data-highlighted]": {
			backgroundColor: colors.surface,
		},
		"[data-checked]": {
			backgroundColor: colors.primaryMuted,
			fontWeight: 500,
		},
		"[data-disabled]": {
			opacity: opacity.disabled,
		},
	},
	danger: {
		color: colors.danger,
	},
	icon: {
		width: 16,
		flexShrink: 0,
		display: "flex",
		justifyContent: "center",
		color: colors.muted,
	},
	dangerIcon: {
		color: colors.danger,
	},
	label: {
		flex: 1,
		minWidth: 0,
	},
	separator: {
		height: 1,
		border: "none",
		backgroundColor: colors.border,
		marginBlock: space["1.5"],
		marginInline: space["2"],
	},
	chevron: {
		display: "flex",
		color: colors.muted,
	},
	radioIndicator: {
		display: "flex",
		color: colors.danger,
	},
});

function Trigger({ children }: { children: React.ReactNode }) {
	return (
		<Base.Trigger {...stylex.props(styles.trigger)}>{children}</Base.Trigger>
	);
}

function Popup({ children }: { children: React.ReactNode }) {
	return (
		<Base.Portal>
			<Base.Positioner {...stylex.props(styles.positioner)} sideOffset={4}>
				<Base.Popup {...stylex.props(styles.popup)}>{children}</Base.Popup>
			</Base.Positioner>
		</Base.Portal>
	);
}

export interface MenuItemProps {
	icon?: React.ReactNode;
	shortcut?: string;
	danger?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
}

function Item({
	icon,
	shortcut,
	danger,
	disabled,
	onClick,
	children,
}: MenuItemProps) {
	return (
		<Base.Item
			{...stylex.props(styles.item, danger && styles.danger)}
			disabled={disabled}
			onClick={onClick}
		>
			{icon && (
				<span {...stylex.props(styles.icon, danger && styles.dangerIcon)}>
					{icon}
				</span>
			)}
			<span {...stylex.props(styles.label)}>{children}</span>
			{shortcut && (
				<KbdGroup>
					{[...shortcut].map((key, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Stable enough for this use case
						<Kbd key={index}>{key}</Kbd>
					))}
				</KbdGroup>
			)}
		</Base.Item>
	);
}

function Separator() {
	return <Base.Separator {...stylex.props(styles.separator)} />;
}

export interface MenuSubmenuProps {
	icon?: React.ReactNode;
	label: string;
	children: React.ReactNode;
}

function Submenu({ icon, label, children }: MenuSubmenuProps) {
	return (
		<Base.SubmenuRoot>
			<Base.SubmenuTrigger {...stylex.props(styles.item)}>
				{icon && <span {...stylex.props(styles.icon)}>{icon}</span>}
				<span {...stylex.props(styles.label)}>{label}</span>
				<span {...stylex.props(styles.chevron)}>
					<CaretRightIcon size={11} weight="bold" />
				</span>
			</Base.SubmenuTrigger>
			<Popup>{children}</Popup>
		</Base.SubmenuRoot>
	);
}

export interface MenuRadioItemProps {
	icon?: React.ReactNode;
	value: string;
	disabled?: boolean;
	children: React.ReactNode;
}

function RadioItem({ icon, value, disabled, children }: MenuRadioItemProps) {
	return (
		<Base.RadioItem
			value={value}
			disabled={disabled}
			{...stylex.props(styles.item)}
		>
			{icon && <span {...stylex.props(styles.icon)}>{icon}</span>}
			<span {...stylex.props(styles.label)}>{children}</span>
			<Base.RadioItemIndicator {...stylex.props(styles.radioIndicator)}>
				<CheckIcon size={13} weight="bold" />
			</Base.RadioItemIndicator>
		</Base.RadioItem>
	);
}

export const Menu = {
	Root: Base.Root,
	Trigger,
	Popup,
	Item,
	Separator,
	Submenu,
	RadioGroup: Base.RadioGroup,
	RadioItem,
};
