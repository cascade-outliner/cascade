import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
	hidden: {
		position: "absolute",
		width: 1,
		height: 1,
		padding: 0,
		margin: -1,
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
		border: 0,
	},
});

export function VisuallyHidden({ children }: { children: ReactNode }) {
	return <span {...stylex.props(styles.hidden)}>{children}</span>;
}
