import type { ReactNode } from "react";
import { css } from "@/styled-system/css";
import type { SystemStyleObject } from "@/styled-system/types";

const styles = {
	container: css.raw({
		width: "full",
		maxWidth: "site.maxWidth",
		marginInline: "auto",
		paddingInline: "site.gutter",
	}),
};

export interface ContainerProps {
	children: ReactNode;
	css?: SystemStyleObject;
}

/** Centers content at the page width with the responsive side gutter. */
export function Container({ children, css: cssProp }: ContainerProps) {
	return <div className={css(styles.container, cssProp)}>{children}</div>;
}
