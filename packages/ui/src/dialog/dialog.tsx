import { Dialog as Base } from "@base-ui/react/dialog";
import { colors } from "@cascade/theme/tokens.stylex";
import { X } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	backdrop: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(43, 45, 51, 0.32)",
		"@starting-style": {
			opacity: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: "150ms",
	},
	popup: {
		position: "fixed",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%) scale(1)",
		minWidth: 320,
		maxWidth: "min(480px, calc(100vw - 32px))",
		maxHeight: "calc(100vh - 32px)",
		overflowY: "auto",
		borderRadius: 13,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: "rgba(43, 45, 51, 0.08)",
		backgroundColor: colors.white,
		padding: 20,
		boxShadow: "0 18px 40px -12px rgba(43, 45, 51, 0.3)",
		outline: "none",
		"@starting-style": {
			transform: "translate(-50%, -50%) scale(0.96)",
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: "150ms",
	},
	header: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 12,
		marginBottom: 12,
	},
	title: {
		fontSize: "1.05rem",
		fontWeight: 600,
		color: colors.ink,
		margin: 0,
	},
	description: {
		fontSize: "0.9rem",
		color: colors.muted,
		marginTop: 4,
		marginBottom: 0,
	},
	close: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 24,
		height: 24,
		flexShrink: 0,
		borderRadius: 7,
		border: "none",
		backgroundColor: "transparent",
		color: colors.muted,
		cursor: "default",
		"[data-highlighted]": {
			backgroundColor: colors.surface,
		},
	},
	body: {
		fontSize: "0.9rem",
		color: colors.ink,
	},
	footer: {
		display: "flex",
		justifyContent: "flex-end",
		gap: 8,
		marginTop: 20,
	},
});

function Popup({
	title,
	description,
	children,
	footer,
}: {
	title: string;
	description?: string;
	children?: React.ReactNode;
	footer?: React.ReactNode;
}) {
	return (
		<Base.Portal>
			<Base.Backdrop {...stylex.props(styles.backdrop)} />
			<Base.Popup {...stylex.props(styles.popup)}>
				<div {...stylex.props(styles.header)}>
					<div>
						<Base.Title {...stylex.props(styles.title)}>{title}</Base.Title>
						{description && (
							<Base.Description {...stylex.props(styles.description)}>
								{description}
							</Base.Description>
						)}
					</div>
					<Base.Close {...stylex.props(styles.close)}>
						<X size={13} weight="bold" />
					</Base.Close>
				</div>
				{children && <div {...stylex.props(styles.body)}>{children}</div>}
				{footer && <div {...stylex.props(styles.footer)}>{footer}</div>}
			</Base.Popup>
		</Base.Portal>
	);
}

export const Dialog = {
	Root: Base.Root,
	Trigger: Base.Trigger,
	Popup,
	Close: Base.Close,
};
