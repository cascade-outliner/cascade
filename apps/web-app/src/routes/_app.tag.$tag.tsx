import { nodesWithTag, plainText } from "@cascade/data";
import { colors, fontSize, radius, space } from "@cascade/theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { AppHeader } from "#/components/app-header.tsx";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	page: {
		maxWidth: 980,
		margin: "0 auto",
		padding: { default: space["8"], "@media (max-width: 640px)": space["4"] },
	},
	title: { fontSize: fontSize["700"], color: colors.ink },
	item: {
		display: "block",
		width: "100%",
		border: "none",
		paddingBlock: space["2"],
		paddingInline: space["2.5"],
		borderRadius: radius.sm,
		backgroundColor: { default: "transparent", ":hover": colors.inkSubtle },
		fontFamily: "inherit",
		fontSize: fontSize["600"],
		textAlign: "left",
		color: colors.ink,
		cursor: "pointer",
	},
	path: { fontSize: fontSize["200"], color: colors.muted },
	empty: { color: colors.muted },
});

/** Every node tagged `#tag`, wherever it sits in the outline; picking one zooms into it. */
const TagPage = observer(function TagPage() {
	const { tag } = Route.useParams();
	const store = useOutlineStore();
	const navigate = useNavigate();
	const nodes = nodesWithTag(store.nodes.values(), tag);

	return (
		<>
			<AppHeader
				zoomedId={null}
				onZoomTo={(id) =>
					navigate({
						to: id ? "/node/$id" : "/",
						params: id ? { id } : undefined,
						viewTransition: true,
					})
				}
			/>
			<div {...stylex.props(styles.page)}>
				<h1 {...stylex.props(styles.title)} data-testid="tag-title">
					#{tag}
				</h1>
				{nodes.length === 0 && (
					<p {...stylex.props(styles.empty)}>No nodes have this tag.</p>
				)}
				{nodes.map((node) => (
					<button
						key={node.id}
						type="button"
						data-testid="tag-result"
						{...stylex.props(styles.item)}
						onClick={() =>
							navigate({
								to: "/node/$id",
								params: { id: node.id },
								viewTransition: true,
							})
						}
					>
						{plainText(node.content)}
						<div {...stylex.props(styles.path)}>
							{store
								.ancestorsOf(node.id)
								.map((a) => plainText(a.content) || "Untitled")
								.join(" / ")}
						</div>
					</button>
				))}
			</div>
		</>
	);
});

export const Route = createFileRoute("/_app/tag/$tag")({
	component: TagPage,
});
