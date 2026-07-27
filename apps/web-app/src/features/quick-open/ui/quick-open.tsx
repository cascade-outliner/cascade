import { Dialog } from "@base-ui/react";
import { Button } from "@cascade/ui/button";
import {
	dialogBackdropMotion,
	dialogPopupMotion,
} from "@cascade/ui/dialog-motion";
import {
	ArrowRightIcon,
	MagnifyingGlassIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	type KeyboardEvent,
	type ReactNode,
	useId,
	useRef,
	useState,
} from "react";
import { m } from "#/paraglide/messages.js";
import { KeyboardShortcutKeys } from "@/features/keyboard-shortcuts/ui/keyboard-shortcut-keys";
import { type client, orpc } from "@/orpc/client";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

type QuickOpenResult = Awaited<
	ReturnType<typeof client.nodes.quickOpen>
>[number];

function Snippet({ result }: { result: QuickOpenResult }) {
	const parts: ReactNode[] = [];
	let offset = 0;
	for (const [index, range] of result.snippet.highlightRanges.entries()) {
		parts.push(result.snippet.text.slice(offset, range.start));
		parts.push(
			<mark
				key={`${range.start}-${range.end}-${index}`}
				className="rounded-sm bg-super-ginger/35 text-inherit"
			>
				{result.snippet.text.slice(range.start, range.end)}
			</mark>,
		);
		offset = range.end;
	}
	parts.push(result.snippet.text.slice(offset));

	return (
		<span>
			{result.snippet.hasPrefix ? "…" : null}
			{parts}
			{result.snippet.hasSuffix ? "…" : null}
		</span>
	);
}

function ResultAncestors({ result }: { result: QuickOpenResult }) {
	if (result.ancestors.length === 0) {
		return <span>{m.quick_open_top_level()}</span>;
	}

	return (
		<>
			{result.ancestors.map((ancestor, index) => (
				<span key={ancestor.id} className="contents">
					{index > 0 ? <span aria-hidden="true">/</span> : null}
					{index === 1 && result.omittedAncestorCount > 0 ? (
						<>
							<span
								title={m.quick_open_omitted_ancestors({
									count: result.omittedAncestorCount,
								})}
							>
								…
							</span>
							<span aria-hidden="true">/</span>
						</>
					) : null}
					<span>{ancestor.text || m.quick_open_untitled()}</span>
				</span>
			))}
		</>
	);
}

export function QuickOpen() {
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

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Trigger
				className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-ink/10 bg-white/70 px-2.5 text-sm text-ink/70 outline-none hover:bg-white hover:text-ink focus-visible:ring-2 focus-visible:ring-danger/50 dark:border-surface/15 dark:bg-ink/70 dark:text-surface/70 dark:hover:bg-ink dark:hover:text-surface"
				aria-label={m.quick_open_trigger()}
			>
				<MagnifyingGlassIcon size={16} weight="bold" />
				<span className="hidden sm:inline">{m.quick_open_trigger()}</span>
				<span className="hidden md:inline">
					<KeyboardShortcutKeys hotkeys={["Mod+K"]} />
				</span>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className={dialogBackdropMotion()} />
				<Dialog.Popup
					initialFocus={inputRef}
					className={`fixed top-[min(18vh,9rem)] left-1/2 z-50 flex max-h-[min(620px,calc(100vh-1rem))] w-[min(680px,calc(100vw-1rem))] -translate-x-1/2 origin-top flex-col overflow-hidden rounded-xl border border-ink/10 bg-white text-ink shadow-2xl outline-none dark:border-surface/15 dark:bg-ink dark:text-surface ${dialogPopupMotion()}`}
				>
					<Dialog.Title className="sr-only">
						{m.quick_open_title()}
					</Dialog.Title>
					<div className="flex items-center gap-3 border-ink/10 border-b px-4 dark:border-surface/15">
						<MagnifyingGlassIcon
							size={20}
							weight="bold"
							className="shrink-0 opacity-50"
						/>
						<input
							ref={inputRef}
							type="search"
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setActiveIndex(0);
							}}
							onKeyDown={onInputKeyDown}
							placeholder={m.quick_open_placeholder()}
							aria-label={m.quick_open_input_label()}
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={results.length > 0}
							aria-controls={listboxId}
							aria-activedescendant={
								results[activeIndex]
									? `${listboxId}-${results[activeIndex].id}`
									: undefined
							}
							className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink/40 dark:placeholder:text-surface/40"
						/>
						<Dialog.Close
							aria-label={m.quick_open_close()}
							className="cursor-pointer rounded-md p-1 outline-none hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/10"
						>
							<XIcon size={18} weight="bold" />
						</Dialog.Close>
					</div>

					<div className="min-h-32 overflow-auto p-2">
						{!canSearch ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_hint()}
							</p>
						) : search.isPending || debouncer.state.isPending ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_loading()}
							</p>
						) : search.isError ? (
							<div className="flex flex-col items-center gap-3 px-3 py-8 text-sm">
								<p>{m.quick_open_error()}</p>
								<Button
									type="button"
									size="sm"
									variant="dark"
									onClick={() => search.refetch()}
								>
									{m.error_generic_retry()}
								</Button>
							</div>
						) : results.length === 0 ? (
							<p className="px-3 py-8 text-center text-ink/55 text-sm dark:text-surface/55">
								{m.quick_open_empty()}
							</p>
						) : (
							<div
								id={listboxId}
								role="listbox"
								aria-label={m.quick_open_results()}
							>
								{results.map((result, index) => (
									<button
										key={result.id}
										id={`${listboxId}-${result.id}`}
										role="option"
										aria-selected={index === activeIndex}
										type="button"
										onMouseMove={() => setActiveIndex(index)}
										onClick={() => selectResult(result)}
										className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:bg-surface/10 ${
											index === activeIndex ? "bg-ink/5 dark:bg-surface/10" : ""
										}`}
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm">
												<Snippet result={result} />
											</span>
											<span className="mt-1 flex min-w-0 items-center gap-1 truncate text-ink/45 text-xs dark:text-surface/45">
												<ResultAncestors result={result} />
											</span>
										</span>
										<ArrowRightIcon
											size={16}
											weight="bold"
											className={`shrink-0 ${
												index === activeIndex ? "opacity-50" : "opacity-0"
											}`}
										/>
									</button>
								))}
							</div>
						)}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
