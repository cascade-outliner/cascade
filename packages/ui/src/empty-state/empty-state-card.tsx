import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

interface ChildrenProps {
	children: ReactNode;
}

const styles = stylex.create({
	card: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: space["2.5"],
		paddingBlock: "34px",
		paddingInline: "22px",
		borderRadius: radius.xl,
		backgroundColor: colors.white,
		boxShadow: `0 0 0 1px ${colors.border}`,
		color: colors.ink,
		textAlign: "center",
	},
	glyph: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "38px",
		height: "38px",
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		color: colors.primary,
		fontSize: "18px",
	},
	title: {
		margin: 0,
		fontSize: fontSize["700"],
		fontWeight: 600,
	},
	body: {
		margin: 0,
		maxWidth: "230px",
		color: colors.muted,
		fontSize: fontSize["300"],
		lineHeight: 1.55,
	},
	action: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		marginTop: space["0.5"],
		paddingBlock: space["2"],
		paddingInline: space["3"],
		border: "none",
		borderRadius: radius.md,
		backgroundColor: {
			default: colors.primaryMuted,
			":hover": colors.inkSubtle,
		},
		color: colors.primary,
		cursor: "pointer",
		fontFamily: "inherit",
		fontSize: fontSize["300"],
		fontWeight: 500,
	},
});

function Root({ children }: ChildrenProps) {
	return <div {...stylex.props(styles.card)}>{children}</div>;
}

function Icon({ children }: ChildrenProps) {
	return (
		<div {...stylex.props(styles.glyph)} aria-hidden>
			{children}
		</div>
	);
}

function Title({ children }: ChildrenProps) {
	return <h2 {...stylex.props(styles.title)}>{children}</h2>;
}

/** One sentence of what happened, one of what to do. */
function Description({ children }: ChildrenProps) {
	return <p {...stylex.props(styles.body)}>{children}</p>;
}

type ActionProps = ChildrenProps &
	(
		| { onClick: () => void; htmlFor?: never }
		/** Renders a label for this input id, so clicking it focuses the input. */
		| { htmlFor: string; onClick?: never }
	);

function Action({ children, onClick, htmlFor }: ActionProps) {
	return htmlFor ? (
		<label htmlFor={htmlFor} {...stylex.props(styles.action)}>
			{children}
		</label>
	) : (
		<button type="button" {...stylex.props(styles.action)} onClick={onClick}>
			{children}
		</button>
	);
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
