import { breakpoints, colors } from "@cascade/theme/tokens.stylex";
import { DotsSixVertical } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	handle: {
		width: { default: 16, [breakpoints.touch]: 24 },
		height: { default: 18, [breakpoints.touch]: 24 },
		flexShrink: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		color: colors.muted,
		cursor: "grab",
		opacity: { default: 0.35, [breakpoints.touch]: 0.55 },
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
