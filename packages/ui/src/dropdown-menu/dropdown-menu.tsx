import { Menu as Base } from "@base-ui/react/menu";
import { css } from "@cascade/theme/css";

const styles = {
	positioner: css({ zIndex: "overlay", outline: "none" }),
	popup: css({
		minWidth: "160px",
		borderRadius: "lg",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		padding: "1.5",
		boxShadow: "popup",
		outline: "none",
	}),
	item: css({
		display: "flex",
		alignItems: "center",
		gap: "3",
		paddingBlock: { base: "2", _pointerCoarse: "3" },
		paddingInline: "3",
		borderRadius: "md",
		fontSize: "500",
		color: "ink",
		cursor: "pointer",
		outline: "none",
		_highlighted: { backgroundColor: "surface" },
	}),
	label: css({
		paddingBlock: "2",
		paddingInline: "3",
		fontSize: "300",
		color: "muted",
	}),
};

function Popup({ children }: { children: React.ReactNode }) {
	return (
		<Base.Portal>
			<Base.Positioner className={styles.positioner} align="end" sideOffset={4}>
				<Base.Popup className={styles.popup}>{children}</Base.Popup>
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
		<Base.Item className={styles.item} onClick={onClick}>
			{icon}
			{children}
		</Base.Item>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	return <div className={styles.label}>{children}</div>;
}

/** A click-to-open menu. `Trigger` takes a `render` element, e.g. `<Menu.Trigger render={<button />} />`. */
export const DropdownMenu = {
	Root: Base.Root,
	Trigger: Base.Trigger,
	Popup,
	Item,
	Label,
};
