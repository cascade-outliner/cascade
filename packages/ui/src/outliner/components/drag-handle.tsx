import { colors } from "@cascade/theme/tokens.stylex";
import { DotsSixVertical } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	handle: {
		width: 16,
		height: 18,
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: colors.muted,
		cursor: "grab",
		opacity: 0.35,
		":hover": {
			opacity: 1,
		},
	},
});

export function DragHandle(props: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...stylex.props(styles.handle)} {...props}>
			<DotsSixVertical size={14} />
		</div>
	);
}
