import { Autocomplete, Dialog } from "@base-ui/react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { NodeTypeName } from "@/core/nodes/node-types";
import { orpc } from "@/orpc/client";
import { HighlightedSnippet } from "@/ui/search/highlighted-snippet";
import { useCommandPaletteShortcut } from "@/ui/search/use-command-palette-shortcut";

interface SearchResult {
	id: string;
	type: NodeTypeName;
	rank: number;
	snippet: string;
	ancestors: { id: string; label: string }[];
}

function useDebounced(value: string, delayMs: number) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}

export function CommandPalette() {
	const [open, setOpen] = useCommandPaletteShortcut();
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounced(query, 200);
	const navigate = useNavigate();

	const { data, isFetching } = useQuery({
		...orpc.nodes.search.queryOptions({ input: { query: debouncedQuery } }),
		enabled: debouncedQuery.length > 0,
	});

	const results: SearchResult[] =
		debouncedQuery.length > 0 ? (data?.results ?? []) : [];

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setQuery("");
	};

	const handleSelect = (id: string) => {
		setOpen(false);
		setQuery("");
		navigate({ to: "/node/$nodeId", params: { nodeId: id } });
	};

	const emptyMessage =
		query.length === 0
			? "Start typing to search"
			: isFetching
				? "Searching…"
				: "No results found";

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-300 data-starting-style:opacity-0 data-starting-style:backdrop-blur-none data-ending-style:opacity-0 data-ending-style:backdrop-blur-none data-ending-style:duration-150" />
				<Dialog.Popup className="fixed top-24 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 scale-100 overflow-hidden rounded-lg border border-dark-grey/10 bg-white text-dark-grey shadow-lg shadow-dark-grey/15 transition-[transform,opacity,scale] duration-200 ease-out outline-none data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger">
					<Dialog.Title className="sr-only">Search</Dialog.Title>
					<Dialog.Description className="sr-only">
						Search nodes by content
					</Dialog.Description>
					<Autocomplete.Root
						items={results}
						filter={null}
						value={query}
						onValueChange={setQuery}
						autoHighlight="always"
						inline
						open
					>
						<div className="flex items-center gap-2 border-dark-grey/10 border-b px-3 dark:border-ginger/15">
							<MagnifyingGlassIcon
								size={16}
								weight="bold"
								className="shrink-0 opacity-50"
							/>
							<Autocomplete.Input
								placeholder="Search nodes…"
								autoFocus
								className="w-full bg-transparent py-3 text-sm outline-none placeholder:opacity-50"
							/>
						</div>
						{results.length > 0 && data?.usedFallback && (
							<div className="px-3 pt-2 text-xs opacity-50">
								No exact matches — showing similar results
							</div>
						)}
						<Autocomplete.List className="max-h-96 overflow-y-auto p-1 empty:hidden">
							{(result: SearchResult) => (
								<Autocomplete.Item
									key={result.id}
									value={result.id}
									onClick={() => handleSelect(result.id)}
									className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 outline-none data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20"
								>
									{result.ancestors.length > 0 && (
										<div className="truncate text-xs opacity-50">
											{result.ancestors.map((a) => a.label).join(" / ")}
										</div>
									)}
									<div className="truncate text-sm">
										<HighlightedSnippet snippet={result.snippet} />
									</div>
								</Autocomplete.Item>
							)}
						</Autocomplete.List>
						<Autocomplete.Empty className="px-3 py-6 text-center text-sm opacity-60">
							{emptyMessage}
						</Autocomplete.Empty>
					</Autocomplete.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
