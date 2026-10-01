import type { ReactNode } from "react";
import { css } from "@/styled-system/css";

const styles = {
	hidden: css({
		position: "absolute",
		width: "hairline",
		height: "hairline",
		padding: "0",
		margin: "-px",
		overflow: "hidden",
		clipPath: "inset(50%)",
		whiteSpace: "nowrap",
		border: 0,
	}),
};

export function VisuallyHidden({ children }: { children: ReactNode }) {
	return <span className={styles.hidden}>{children}</span>;
}
