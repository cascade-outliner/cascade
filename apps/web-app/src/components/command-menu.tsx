import {
	dayId,
	type Node,
	plainText,
	type SearchHit,
	textState,
} from "@cascade/data";
import {
	CommandPalette,
	type PaletteGroup,
	type PaletteItem,
} from "@cascade/ui/command-palette";
import {
	CalendarBlankIcon,
	CheckCircleIcon,
	CircleIcon,
	HouseSimpleIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useDeferredValue, useEffect } from "react";
import { flushSync } from "react-dom";
import { useOutlineStore } from "#/lib/outline-store.tsx";

const NODE_LIMIT = 8;

const menu = observable({ open: false, query: "" });

const setOpen = (open: boolean) => runInAction(() => (menu.open = open));
const setQuery = (query: string) => runInAction(() => (menu.query = query));

/** Opens the menu with an empty query, synchronously so the input can take focus right away. */
export function openCommandMenu() {
	flushSync(() =>
		runInAction(() => {
			menu.query = "";
			menu.open = true;
		}),
	);
}

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
	const { open, query } = menu;
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
			if (menu.open) {
				setOpen(false);
			} else {
				openCommandMenu();
			}
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () =>
			window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, []);

	const create = () => {
		const text = query.trim();
		if (!text) return;
		store.create(zoomedId, { content: textState(text) });
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

		const navigation: PaletteItem[] = [
			{
				id: "today",
				label: "Today's note",
				icon: <CalendarBlankIcon size={13} />,
				onSelect: () =>
					navigate({
						to: "/node/$id",
						params: { id: dayId(new Date()) },
						viewTransition: true,
					}),
			},
		];
		if (zoomedId) {
			navigation.push({
				id: "home",
				label: "Go back home",
				icon: <HouseSimpleIcon size={13} />,
				onSelect: () => navigate({ to: "/", viewTransition: true }),
			});
		}
		groups.push({ label: "Navigation", items: navigation });
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
