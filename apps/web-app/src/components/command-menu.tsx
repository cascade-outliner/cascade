import { type Node, plainText, type SearchHit, textState } from "@cascade/data";
import {
	CommandPalette,
	type PaletteGroup,
	type PaletteItem,
} from "@cascade/ui/command-palette";
import {
	CheckCircleIcon,
	CircleIcon,
	HouseSimpleIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { observer } from "mobx-react-lite";
import { useDeferredValue, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const NODE_LIMIT = 8;

function nodeIcon(node: Node) {
	if (!node.task) return <CircleIcon size={6} weight="fill" />;
	return node.task.done ? (
		<CheckCircleIcon size={14} weight="fill" />
	) : (
		<CircleIcon size={14} />
	);
}

/** ⌘K from anywhere: find a node and zoom into it, or create one from the query. */
export const CommandMenu = observer(function CommandMenu() {
	const store = useOutlineStore();
	const navigate = useNavigate();
	const zoomedId = useParams({ strict: false }).id ?? null;
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.key.toLowerCase() !== "k" ||
				!(event.metaKey || event.ctrlKey) ||
				event.altKey ||
				event.shiftKey
			) {
				return;
			}
			event.preventDefault();
			if (open) {
				setOpen(false);
				return;
			}

			flushSync(() => {
				setQuery("");
				setOpen(true);
			});
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, [open]);

	const create = () => {
		const text = query.trim();
		if (!text) return;
		const id = store.create(zoomedId);
		store.setContent(id, textState(text));
	};

	const groups: PaletteGroup[] = [];
	let status: string | undefined;

	if (open) {
		const nodeItems = (hits: SearchHit[], pathFrom?: string) =>
			hits.map(({ node, text, ranges }): PaletteItem => {
				const ancestors = store.ancestorsOf(node.id);
				const path = ancestors
					.slice(ancestors.findIndex((each) => each.id === pathFrom) + 1)
					.map((ancestor) => plainText(ancestor.content) || "Untitled")
					.join(" / ");
				return {
					id: node.id,
					label: text,
					ranges,
					detail: path || undefined,
					icon: nodeIcon(node),
					onSelect: () =>
						navigate({
							to: "/node/$id",
							params: { id: node.id },
							viewTransition: true,
						}),
				};
			});

		const children = zoomedId
			? store.search(deferredQuery, { limit: NODE_LIMIT, within: zoomedId })
			: undefined;
		const others = store.search(deferredQuery, {
			limit: NODE_LIMIT,
			excluding: zoomedId ?? undefined,
		});
		const total = (children?.total ?? 0) + others.total;
		if (deferredQuery.trim()) {
			status = `${total} result${total === 1 ? "" : "s"}`;
		}
		if (children && zoomedId) {
			groups.push({
				label: "Children",
				items: nodeItems(children.hits, zoomedId),
			});
		}
		groups.push({ label: "Nodes", items: nodeItems(others.hits) });

		if (query.trim()) {
			groups.push({
				label: "Create",
				items: [
					{
						id: "create",
						label: `New node “${query.trim()}”`,
						icon: <PlusIcon size={13} />,
						shortcut: "⌘⏎",
						onSelect: create,
					},
				],
			});
		}

		if (zoomedId) {
			groups.push({
				label: "Navigation",
				items: [
					{
						id: "home",
						label: "Go back home",
						icon: <HouseSimpleIcon size={13} />,
						onSelect: () => navigate({ to: "/", viewTransition: true }),
					},
				],
			});
		}
	}

	return (
		<CommandPalette
			open={open}
			onOpenChange={setOpen}
			query={query}
			onQueryChange={setQuery}
			groups={groups}
			placeholder="Find or create a node…"
			status={status}
			hints={["↑↓ navigate", "⏎ zoom in", "⌘⏎ create"]}
			scope="searching all nodes"
			onKeyDown={(event) => {
				if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
					return false;
				}
				setOpen(false);
				create();
				return true;
			}}
		/>
	);
});
