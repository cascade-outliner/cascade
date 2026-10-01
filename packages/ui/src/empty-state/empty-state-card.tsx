import { css } from "@cascade/theme/css";
import type { ReactNode } from "react";
import { Button } from "../button/button.tsx";

interface ChildrenProps {
	children: ReactNode;
}

const styles = {
	card: css({
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "2.5",
		paddingBlock: "34px",
		paddingInline: "22px",
		color: "ink",
		textAlign: "center",
	}),
	glyph: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "38px",
		height: "38px",
		borderRadius: "lg",
		backgroundColor: "surface",
		color: "primary",
		fontSize: "18px",
	}),
	title: css({
		margin: 0,
		fontSize: "700",
		fontWeight: 600,
	}),
	body: css({
		margin: 0,
		maxWidth: "230px",
		color: "muted",
		fontSize: "300",
		lineHeight: 1.55,
	}),
};

function Root({ children }: ChildrenProps) {
	return <div className={styles.card}>{children}</div>;
}

function Icon({ children }: ChildrenProps) {
	return (
		<div className={styles.glyph} aria-hidden>
			{children}
		</div>
	);
}

function Title({ children }: ChildrenProps) {
	return <h2 className={styles.title}>{children}</h2>;
}

/** One sentence of what happened, one of what to do. */
function Description({ children }: ChildrenProps) {
	return <p className={styles.body}>{children}</p>;
}

interface ActionProps extends ChildrenProps {
	onClick: () => void;
}

function Action({ children, onClick }: ActionProps) {
	return <Button onClick={onClick}>{children}</Button>;
}

/** Keyboard hint inside an `Action`, e.g. "↵". */
function Shortcut({ children }: ChildrenProps) {
	return <span aria-hidden>{children}</span>;
}

export const EmptyStateCard = {
	Root,
	Icon,
	Title,
	Description,
	Action,
	Shortcut,
};
