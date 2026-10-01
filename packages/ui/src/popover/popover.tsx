import { Popover as Base } from "@base-ui/react/popover";
import {
	borderWidth,
	colors,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	positioner: { zIndex: zIndex.overlay },
	popup: {
		padding: space["3"],
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		boxShadow: shadow.popup,
		outline: "none",
	},
});

function Popup({
	anchor,
	side = "bottom",
	align = "start",
	sideOffset = 8,
	initialFocus,
	label,
	style,
	children,
}: {
	anchor?: Base.Positioner.Props["anchor"];
	side?: Base.Positioner.Props["side"];
	align?: Base.Positioner.Props["align"];
	sideOffset?: number;
	initialFocus?: Base.Popup.Props["initialFocus"];
	label?: string;
	style?: stylex.StyleXStyles;
	children: React.ReactNode;
}) {
	return (
		<Base.Portal>
			<Base.Positioner
				anchor={anchor}
				side={side}
				align={align}
				sideOffset={sideOffset}
				{...stylex.props(styles.positioner)}
			>
				<Base.Popup
					aria-label={label}
					initialFocus={initialFocus}
					{...stylex.props(styles.popup, style)}
				>
					{children}
				</Base.Popup>
			</Base.Positioner>
		</Base.Portal>
	);
}

export const Popover = {
	Root: Base.Root,
	Trigger: Base.Trigger,
	Popup,
	Close: Base.Close,
};
