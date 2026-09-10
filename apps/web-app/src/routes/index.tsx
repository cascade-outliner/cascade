import { Content } from "@cascade/ui/outliner/content";
import { Root } from "@cascade/ui/outliner/root";
import { VirtualList } from "@cascade/ui/outliner/virtual-list";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { CreateNodeButton } from "#/components/create-node-button";
import { SeedToolbar } from "#/components/seed-toolbar.tsx";
import { OutlineStoreProvider, useOutlineStore } from "#/lib/outline-store.tsx";

const styles = stylex.create({
	row: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		gap: 4,
	},
	page: {
		padding: 32,
		display: "flex",
		flexDirection: "column",
		gap: 16,
	},
	toolbar: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	outline: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
	},
});

const Outline = observer(function Outline() {
	const store = useOutlineStore();
	if (store.status !== "ready") {
		return null;
	}

	return (
		<div {...stylex.props(styles.page)}>
			<div {...stylex.props(styles.toolbar)}>
				<CreateNodeButton />
				<SeedToolbar />
			</div>
			<Root style={styles.outline}>
				<VirtualList nodes={store.tree}>
					{(node) => (
						<div {...stylex.props(styles.row)}>
							<Content
								onChange={(state) => store.setContent(node.id, state.toJSON())}
							/>
						</div>
					)}
				</VirtualList>
			</Root>
		</div>
	);
});

function Home() {
	return (
		<OutlineStoreProvider>
			<Outline />
		</OutlineStoreProvider>
	);
}

export const Route = createFileRoute("/")({ component: Home });
