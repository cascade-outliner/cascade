import { colors, radius, shadow } from "@cascade/theme/tokens.stylex";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OPEN_LINK_DIALOG_COMMAND } from "./link-dialog.tsx";
import { isSafeUrl, LINK_ATTRIBUTES, LINK_MATCHERS, openUrl } from "./url.ts";

const styles = stylex.create({
	button: {
		position: "absolute",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "1.1em",
		height: "1.1em",
		padding: 0,
		border: "none",
		borderRadius: radius.sm,
		backgroundColor: { default: "transparent", ":hover": colors.surface },
		color: colors.muted,
		cursor: "pointer",
		outline: "none",
		boxShadow: { default: "none", ":focus-visible": shadow.focusRing },
	},
	at: (left: number, top: number, height: number) => ({
		left: left + 2,
		top: top + height / 2,
		transform: "translateY(-50%)",
	}),
});

interface LinkSpot {
	href: string;
	left: number;
	top: number;
	height: number;
}

function sameSpots(a: LinkSpot[], b: LinkSpot[]) {
	return (
		a.length === b.length &&
		a.every((spot, i) => {
			const other = b[i];
			return (
				other !== undefined &&
				spot.href === other.href &&
				spot.left === other.left &&
				spot.top === other.top &&
				spot.height === other.height
			);
		})
	);
}

function OpenLinkButtons() {
	const [editor] = useLexicalComposerContext();
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const [spots, setSpots] = useState<LinkSpot[]>([]);

	useEffect(
		() =>
			editor.registerRootListener((root) =>
				setContainer(root?.parentElement ?? null),
			),
		[editor],
	);

	useEffect(() => {
		if (!container) return;
		const measure = () => {
			const root = editor.getRootElement();
			if (!root) return;
			const origin = container.getBoundingClientRect();
			const next: LinkSpot[] = [];
			for (const anchor of root.querySelectorAll("a[href]")) {
				const href = anchor.getAttribute("href");
				const rects = anchor.getClientRects();
				const last = rects[rects.length - 1];
				if (!href || !last || !isSafeUrl(href)) continue;
				next.push({
					href,
					left: Math.round(last.right - origin.left),
					top: Math.round(last.top - origin.top),
					height: Math.round(last.height),
				});
			}
			setSpots((prev) => (sameSpots(prev, next) ? prev : next));
		};
		measure();
		const stopUpdates = editor.registerUpdateListener(measure);
		const observer = new ResizeObserver(measure);
		const root = editor.getRootElement();
		if (root) observer.observe(root);
		window.addEventListener("resize", measure);
		return () => {
			stopUpdates();
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [editor, container]);

	if (!container) return null;
	return createPortal(
		spots.map((spot, index) => (
			<button
				// biome-ignore lint/suspicious/noArrayIndexKey: spots have no identity beyond position
				key={index}
				type="button"
				data-testid="link-open"
				data-href={spot.href}
				aria-label={`Open ${spot.href} in new tab`}
				title="Open in new tab"
				tabIndex={-1}
				contentEditable={false}
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => openUrl(spot.href)}
				{...stylex.props(
					styles.button,
					styles.at(spot.left, spot.top, spot.height),
				)}
			>
				<ArrowSquareOutIcon size="0.85em" weight="bold" />
			</button>
		)),
		container,
	);
}

function ClickToOpenPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const anchor = event.target.closest("a[href]");
			if (!anchor) return;
			event.preventDefault();
			if (editor.isEditable() && !event.metaKey && !event.ctrlKey) {
				if (anchor instanceof HTMLElement) {
					editor.dispatchCommand(OPEN_LINK_DIALOG_COMMAND, anchor);
				}
				return;
			}
			const href = anchor.getAttribute("href");
			if (href) openUrl(href);
		};
		return editor.registerRootListener((root, previous) => {
			previous?.removeEventListener("click", onClick);
			root?.addEventListener("click", onClick);
		});
	}, [editor]);

	return null;
}

export function LinkPlugins() {
	return (
		<>
			<LinkPlugin validateUrl={isSafeUrl} attributes={LINK_ATTRIBUTES} />
			<AutoLinkPlugin matchers={LINK_MATCHERS} />
			<ClickToOpenPlugin />
			<OpenLinkButtons />
		</>
	);
}
