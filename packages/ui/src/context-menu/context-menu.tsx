import { ContextMenu as Base } from "@base-ui/react/context-menu";
import { css } from "@cascade/theme/css";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { Kbd, KbdGroup } from "../kbd/kbd";

const styles = {
	trigger: css({
		display: "contents",
	}),
	positioner: css({
		zIndex: "overlay",
		outline: "none",
	}),
	popup: css({
		minWidth: "200px",
		maxWidth: "calc(100vw - 32px)",
		borderRadius: "lg",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		padding: "1.5",
		boxShadow: "popup",
		outline: "none",
	}),
	item: css.raw({
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: { base: "2", _pointerCoarse: "3" },
		paddingInline: "3",
		borderRadius: "md",
		fontSize: "500",
		color: "ink",
		cursor: "default",
		outline: "none",
		_highlighted: {
			backgroundColor: "surface",
		},
		"&:hover:not([data-disabled])": {
			backgroundColor: "surface",
		},
		_checked: {
			backgroundColor: "primaryMuted",
			fontWeight: 500,
		},
		_disabled: {
			opacity: "disabled",
		},
	}),
	danger: css.raw({
		color: "danger",
	}),
	icon: css.raw({
		width: "16px",
		flexShrink: 0,
		display: "flex",
		justifyContent: "center",
		color: "muted",
	}),
	dangerIcon: css.raw({
		color: "danger",
	}),
	label: css({
		flex: 1,
		minWidth: 0,
	}),
	separator: css({
		height: "1px",
		border: "none",
		backgroundColor: "border",
		marginBlock: "1.5",
		marginInline: "2",
	}),
	chevron: css({
		display: "flex",
		color: "muted",
	}),
	custom: css({
		padding: "1.5",
	}),
	radioIndicator: css({
		display: "flex",
		color: "primary",
	}),
};

function Trigger({ children }: { children: React.ReactNode }) {
	return <Base.Trigger className={styles.trigger}>{children}</Base.Trigger>;
}

function Root(props: React.ComponentProps<typeof Base.Root>) {
	return <Base.Root highlightItemOnHover={false} {...props} />;
}

function Popup({ children }: { children: React.ReactNode }) {
	return (
		<Base.Portal>
			<Base.Positioner className={styles.positioner} sideOffset={4}>
				<Base.Popup className={styles.popup}>{children}</Base.Popup>
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
			className={css(styles.item, danger && styles.danger)}
			disabled={disabled}
			onClick={onClick}
		>
			{icon && (
				<span className={css(styles.icon, danger && styles.dangerIcon)}>
					{icon}
				</span>
			)}
			<span className={styles.label}>{children}</span>
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
	return <Base.Separator className={styles.separator} />;
}

export interface MenuSubmenuProps {
	icon?: React.ReactNode;
	label: string;
	children: React.ReactNode;
}

function Submenu({ icon, label, children }: MenuSubmenuProps) {
	return (
		<Base.SubmenuRoot highlightItemOnHover={false}>
			<Base.SubmenuTrigger className={css(styles.item)}>
				{icon && <span className={css(styles.icon)}>{icon}</span>}
				<span className={styles.label}>{label}</span>
				<span className={styles.chevron}>
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
			className={css(styles.item)}
		>
			{icon && <span className={css(styles.icon)}>{icon}</span>}
			<span className={styles.label}>{children}</span>
			<Base.RadioItemIndicator className={styles.radioIndicator}>
				<CheckIcon size={13} weight="bold" />
			</Base.RadioItemIndicator>
		</Base.RadioItem>
	);
}

export interface MenuCustomProps {
	/** Names the group for assistive tech, e.g. "Calendar". */
	label: string;
	children: React.ReactNode;
}

/**
 * Non-item content inside a menu, such as a calendar. Keys stay with the
 * content, so arrows and typing don't move the menu's highlight; Escape
 * still closes the menu.
 */
function Custom({ label, children }: MenuCustomProps) {
	return (
		<Base.Group
			aria-label={label}
			className={styles.custom}
			onKeyDown={(event) => {
				if (event.key !== "Escape") event.stopPropagation();
			}}
		>
			{children}
		</Base.Group>
	);
}

export const Menu = {
	Root,
	Trigger,
	Popup,
	Item,
	Separator,
	Submenu,
	Custom,
	RadioGroup: Base.RadioGroup,
	RadioItem,
};
