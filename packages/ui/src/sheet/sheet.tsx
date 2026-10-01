import { Dialog as Base } from "@base-ui/react/dialog";
import { media } from "@cascade/theme/media.stylex";
import {
	borderWidth,
	colors,
	fontSize,
	radius,
	shadow,
	space,
	zIndex,
} from "@cascade/theme/tokens.stylex";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
	popup: {
		position: "fixed",
		zIndex: zIndex.popup,
		// Floats inside the viewport rather than sticking to its edge.
		top: { default: space["3"], [media.mobile]: "auto" },
		right: { default: space["3"], [media.mobile]: space["2"] },
		bottom: { default: "auto", [media.mobile]: space["2"] },
		left: { default: "auto", [media.mobile]: space["2"] },
		width: { default: 440, [media.mobile]: "auto" },
		// Fits its content, up to the viewport.
		maxHeight: {
			default: `calc(100dvh - 2 * ${space["3"]})`,
			[media.mobile]: "85dvh",
		},
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		borderRadius: radius.xl,
		borderWidth: borderWidth.thin,
		borderStyle: "solid",
		borderColor: colors.border,
		backgroundColor: colors.white,
		boxShadow: shadow.popup,
		outline: "none",
		"@starting-style": {
			transform: {
				default: "translateX(16px) scale(0.98)",
				[media.mobile]: "translateY(16px)",
			},
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: { default: "200ms", [media.reducedMotion]: "0s" },
		transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: space["2"],
		paddingBlock: space["5"],
		paddingInline: space["6"],
		borderBottomWidth: borderWidth.thin,
		borderBottomStyle: "solid",
		borderBottomColor: colors.border,
		color: colors.primary,
	},
	title: {
		flex: 1,
		margin: 0,
		fontSize: "1.2rem",
		fontWeight: 600,
		letterSpacing: "-0.01em",
		color: colors.ink,
	},
	description: {
		margin: 0,
		paddingInline: space["6"],
		paddingBlock: space["4"],
		fontSize: fontSize["500"],
		color: colors.muted,
	},
	close: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: 28,
		height: 28,
		border: "none",
		borderRadius: radius.md,
		padding: 0,
		backgroundColor: { default: "transparent", ":hover": colors.surface },
		color: colors.muted,
		cursor: "pointer",
		outline: "none",
		":focus-visible": {
			boxShadow: shadow.focusRing,
		},
	},
	body: {
		flex: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: `${space["4"]} ${space["5"]}`,
	},
	footer: {
		display: "flex",
		justifyContent: "flex-end",
		gap: space["2"],
		paddingBlock: space["4"],
		paddingInline: space["6"],
		borderTopWidth: borderWidth.thin,
		borderTopStyle: "solid",
		borderTopColor: colors.border,
	},
});

function Popup({
	title,
	icon,
	description,
	children,
	footer,
}: {
	title: string;
	/** Before the title, in the primary color. */
	icon?: ReactNode;
	description?: string;
	children?: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<Base.Portal>
			<Base.Popup {...stylex.props(styles.popup)}>
				<div {...stylex.props(styles.header)}>
					{icon}
					<Base.Title {...stylex.props(styles.title)}>{title}</Base.Title>
					<Base.Close aria-label="Close" {...stylex.props(styles.close)}>
						<XIcon size={16} />
					</Base.Close>
				</div>
				{description && (
					<Base.Description {...stylex.props(styles.description)}>
						{description}
					</Base.Description>
				)}
				{children && <div {...stylex.props(styles.body)}>{children}</div>}
				{footer && <div {...stylex.props(styles.footer)}>{footer}</div>}
			</Base.Popup>
		</Base.Portal>
	);
}

/** A panel floating at the top right of the viewport (bottom on phones), over the page without dimming it. */
export const Sheet = {
	Root: Base.Root,
	Popup,
};
