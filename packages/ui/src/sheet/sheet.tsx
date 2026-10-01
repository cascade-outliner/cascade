import { Dialog as Base } from "@base-ui/react/dialog";
import { css } from "@cascade/theme/css";
import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const styles = {
	popup: css({
		position: "fixed",
		zIndex: "popup",
		// Floats inside the viewport rather than sticking to its edge.
		top: { base: "3", _mobile: "auto" },
		right: { base: "3", _mobile: "2" },
		bottom: { base: "auto", _mobile: "2" },
		left: { base: "auto", _mobile: "2" },
		width: { base: "440px", _mobile: "auto" },
		// Fits its content, up to the viewport.
		maxHeight: {
			base: "calc(100dvh - 2 * token(spacing.3))",
			_mobile: "85dvh",
		},
		display: "flex",
		flexDirection: "column",
		overflow: "hidden",
		borderRadius: "xl",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		boxShadow: "popup",
		outline: "none",
		_starting: {
			transform: {
				base: "translateX(16px) scale(0.98)",
				_mobile: "translateY(16px)",
			},
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: { base: "200ms", _motionReduce: "0s" },
		transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
	}),
	header: css({
		display: "flex",
		alignItems: "center",
		gap: "2",
		paddingBlock: "5",
		paddingInline: "6",
		borderBottomWidth: "thin",
		borderBottomStyle: "solid",
		borderBottomColor: "border",
		color: "primary",
	}),
	title: css({
		flex: 1,
		margin: 0,
		fontSize: "1.2rem",
		fontWeight: 600,
		letterSpacing: "-0.01em",
		color: "ink",
	}),
	description: css({
		margin: 0,
		paddingInline: "6",
		paddingBlock: "4",
		fontSize: "500",
		color: "muted",
	}),
	close: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "28px",
		height: "28px",
		border: "none",
		borderRadius: "md",
		padding: 0,
		backgroundColor: { base: "transparent", _hover: "surface" },
		color: "muted",
		cursor: "pointer",
		outline: "none",
		_focusVisible: {
			boxShadow: "focusRing",
		},
	}),
	body: css({
		flex: 1,
		minHeight: 0,
		overflowY: "auto",
		paddingBlock: "4",
		paddingInline: "5",
	}),
	footer: css({
		display: "flex",
		justifyContent: "flex-end",
		gap: "2",
		paddingBlock: "4",
		paddingInline: "6",
		borderTopWidth: "thin",
		borderTopStyle: "solid",
		borderTopColor: "border",
	}),
};

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
			<Base.Popup className={styles.popup}>
				<div className={styles.header}>
					{icon}
					<Base.Title className={styles.title}>{title}</Base.Title>
					<Base.Close aria-label="Close" className={styles.close}>
						<XIcon size={16} />
					</Base.Close>
				</div>
				{description && (
					<Base.Description className={styles.description}>
						{description}
					</Base.Description>
				)}
				{children && <div className={styles.body}>{children}</div>}
				{footer && <div className={styles.footer}>{footer}</div>}
			</Base.Popup>
		</Base.Portal>
	);
}

/** A panel floating at the top right of the viewport (bottom on phones), over the page without dimming it. */
export const Sheet = {
	Root: Base.Root,
	Popup,
};
