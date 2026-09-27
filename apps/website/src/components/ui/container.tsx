import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { siteLayout } from "@/theme/site.stylex";

const styles = stylex.create({
	container: {
		width: "100%",
		maxWidth: siteLayout.maxWidth,
		marginInline: "auto",
		paddingInline: siteLayout.gutter,
	},
});

export interface ContainerProps {
	children: ReactNode;
	style?: stylex.StyleXStyles;
}

/** Centers content at the page width with the responsive side gutter. */
export function Container({ children, style }: ContainerProps) {
	return <div {...stylex.props(styles.container, style)}>{children}</div>;
}
