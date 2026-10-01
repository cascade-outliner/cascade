import { Dialog as Base } from "@base-ui/react/dialog";
import { css } from "@cascade/theme/css";
import { XIcon } from "@phosphor-icons/react";

const styles = {
	backdrop: css({
		position: "fixed",
		inset: 0,
		zIndex: "overlay",
		backgroundColor: "overlay",
		_starting: {
			opacity: 0,
		},
		transitionProperty: "opacity",
		transitionDuration: { base: "150", _motionReduce: "0s" },
	}),
	popup: css({
		position: "fixed",
		zIndex: "popup",
		top: { base: "50%", _mobile: "auto" },
		left: { base: "50%", _mobile: "4" },
		right: { base: "auto", _mobile: "4" },
		bottom: { base: "auto", _mobile: "4" },
		transform: {
			base: "translate(-50%, -50%) scale(1)",
			_mobile: "none",
		},
		minWidth: { base: "320px", _mobile: "auto" },
		maxWidth: {
			base: "min(480px, calc(100vw - 32px))",
			_mobile: "none",
		},
		maxHeight: "calc(100vh - 32px)",
		overflowY: "auto",
		borderRadius: "lg",
		borderWidth: "thin",
		borderStyle: "solid",
		borderColor: "border",
		backgroundColor: "white",
		padding: { base: "5", _mobile: "4" },
		boxShadow: "popup",
		outline: "none",
		_starting: {
			transform: {
				base: "translate(-50%, -50%) scale(0.96)",
				_mobile: "translateY(16px)",
			},
			opacity: 0,
		},
		transitionProperty: "transform, opacity",
		transitionDuration: { base: "150", _motionReduce: "0s" },
	}),
	header: css({
		display: "flex",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: "3",
		marginBottom: "3",
	}),
	title: css({
		fontSize: "700",
		fontWeight: 600,
		color: "ink",
		margin: 0,
	}),
	description: css({
		fontSize: "500",
		color: "muted",
		marginTop: "1",
		marginBottom: 0,
	}),
	close: css({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: { base: "24px", _pointerCoarse: "32px" },
		height: { base: "24px", _pointerCoarse: "32px" },
		flexShrink: 0,
		borderRadius: "md",
		border: "none",
		backgroundColor: "transparent",
		color: "muted",
		cursor: "pointer",
		outline: "none",
		_highlighted: {
			backgroundColor: "surface",
		},
		_focusVisible: {
			boxShadow: "focusRing",
		},
	}),
	body: css({
		fontSize: "500",
		color: "ink",
	}),
	footer: css({
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: "2",
		marginTop: "5",
	}),
};

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
			<Base.Backdrop className={styles.backdrop} />
			<Base.Popup className={styles.popup}>
				<div className={styles.header}>
					<div>
						<Base.Title className={styles.title}>{title}</Base.Title>
						{description && (
							<Base.Description className={styles.description}>
								{description}
							</Base.Description>
						)}
					</div>
					<Base.Close aria-label="Close" className={styles.close}>
						<XIcon size={13} weight="bold" />
					</Base.Close>
				</div>
				{children && <div className={styles.body}>{children}</div>}
				{footer && <div className={styles.footer}>{footer}</div>}
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
