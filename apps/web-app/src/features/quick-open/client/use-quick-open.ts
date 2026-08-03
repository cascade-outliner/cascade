import { useHotkey } from "@tanstack/react-hotkeys";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import type { QuickOpenResult } from "@/features/quick-open/model/types";
import { orpc } from "@/orpc/client";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

export function useQuickOpen() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();
	const listboxId = useId();
	const trimmedQuery = query.trim();
	const [debouncedQuery, debouncer] = useDebouncedValue(
		trimmedQuery,
		{ wait: DEBOUNCE_MS },
		(state) => ({ isPending: state.isPending }),
	);
	const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;
	const search = useQuery({
		...orpc.nodes.quickOpen.queryOptions({
			input: { query: debouncedQuery },
		}),
		enabled:
			open && debouncedQuery.trim().length >= MIN_QUERY_LENGTH && canSearch,
	});
	const results = search.data ?? [];

	useHotkey(
		"Mod+K",
		(event) => {
			event.preventDefault();
			setOpen(true);
		},
		{ ignoreInputs: false, preventDefault: false },
	);

	const onOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setQuery("");
			setActiveIndex(0);
		}
	};

	const selectResult = (result: QuickOpenResult) => {
		onOpenChange(false);
		router.navigate({
			to: "/$nodeSlug",
			params: { nodeSlug: result.slug },
			viewTransition: true,
		});
	};

	const onQueryChange = (nextQuery: string) => {
		setQuery(nextQuery);
		setActiveIndex(0);
	};

	const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (results.length === 0) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((current) => (current + 1) % results.length);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex(
				(current) => (current - 1 + results.length) % results.length,
			);
		} else if (event.key === "Enter") {
			event.preventDefault();
			const result = results[activeIndex];
			if (result) selectResult(result);
		}
	};

	return {
		open,
		onOpenChange,
		query,
		onQueryChange,
		activeIndex,
		setActiveIndex,
		inputRef,
		listboxId,
		canSearch,
		isLoading: search.isPending || debouncer.state.isPending,
		isError: search.isError,
		refetch: search.refetch,
		results,
		selectResult,
		onInputKeyDown,
	};
}
