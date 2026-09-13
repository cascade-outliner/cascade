import { Dialog as Base } from "@base-ui/react/dialog";
import {
	borderWidth,
	colors,
	duration,
	fontSize,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import { X } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
	backdrop: {
		position: "fixed",
		inset: 0,
		zIndex: zIndex.overlay,
		backgroundColor: colors.overlay,
		"@starting-style": {
			opacity: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: duration["150"],
	},
	popup: {
		position: "fixed",
		zIndex: zIndex.popup,
		top: { default: "50%", "@media (max-width: 640px)": "auto" },
		left: { default: "50%", "@media (max-width: 640px)": space["4"] },
		right: { default: "auto", "@media (max-width: 640px)": space["4"] },
		bottom: { default: "auto", "@media (max-width: 640px)": space["4"] },
		transform: {
			default: "translate(-50%, -50%) scale(1)",
			"@media (max-width: 640px)": "none",
		},
		minWidth: { default: 320, "@media (max-width: 640px)": "auto" },
		maxWidth: {
			default: "min(480px, calc(100vw - 32px))",
			"@media (max-width: 640px)": "none",
		},
		maxHeight: "calc(100vh - 32px)",
		overflowY: "auto",
		borderRadius: radius.lg,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		padding: { default: space["5"], "@media (max-width: 640px)": space["4"] },
		boxShadow: shadow.popup,
		outline: "none",
		"@starting-style": {
			transform: {
				default: "translate(-50%, -50%) scale(0.96)",
				"@media (max-width: 640px)": "translateY(16px)",
			},
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: duration["150"],
	},
	header: {
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: space["3"],
		marginBottom: space["3"],
	},
	title: {
		fontSize: fontSize["700"],
		fontWeight: 600,
		color: colors.ink,
		margin: 0,
	},
	description: {
		fontSize: fontSize["500"],
		color: colors.muted,
		marginTop: space["1"],
		marginBottom: 0,
	},
	close: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: { default: 24, "@media (hover: none)": 32 },
		height: { default: 24, "@media (hover: none)": 32 },
		flexShrink: 0,
		borderRadius: radius.md,
		border: "none",
		backgroundColor: "transparent",
		color: colors.muted,
		cursor: "default",
		"[data-highlighted]": {
			backgroundColor: colors.surface,
		},
	},
	body: {
		fontSize: fontSize["500"],
		color: colors.ink,
	},
	footer: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: space["2"],
		marginTop: space["5"],
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
