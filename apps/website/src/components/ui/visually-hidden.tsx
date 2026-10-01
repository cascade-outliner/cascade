import type { ReactNode } from "react";
import { css } from "@/styled-system/css";

const styles = {
	hidden: css({
		position: "absolute",
		width: "1px",
		height: "1px",
		padding: 0,
		margin: "-1px",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
		border: 0,
	}),
};

export function VisuallyHidden({ children }: { children: ReactNode }) {
	return <span className={styles.hidden}>{children}</span>;
}
