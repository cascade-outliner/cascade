import { css } from "@cascade/theme/css";
import type { ReactNode } from "react";

const styles = {
	group: css({
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		gap: "0.5",
	}),
	key: css({
		cursor: "default",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		paddingBlock: "px",
		paddingInline: "1.5",
		borderRadius: "sm",
		backgroundColor: "muted",
		color: "white",
		fontFamily: "mono",
		fontSize: "200",
		lineHeight: "compact",
	}),
};

export interface KbdProps {
	children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
	return <kbd className={styles.key}>{children}</kbd>;
}

export function KbdGroup({ children }: { children: ReactNode }) {
	return <kbd className={styles.group}>{children}</kbd>;
}
