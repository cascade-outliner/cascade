import {
	CircleNotchIcon,
	MagnifyingGlassIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import {
	type EmojiPickerListCategoryHeaderProps,
	type EmojiPickerListEmojiProps,
	type EmojiPickerListRowProps,
	EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
	return (
		<div {...props} className="scroll-my-1 px-1">
			{children}
		</div>
	);
}

function EmojiPickerEmoji({ emoji, ...props }: EmojiPickerListEmojiProps) {
	return (
		<button
			{...props}
			className="flex size-7 items-center justify-center rounded-md text-base data-[active]:bg-ink/10 dark:data-[active]:bg-surface/15"
		>
			{emoji.emoji}
		</button>
	);
}

function EmojiPickerCategoryHeader({
	category,
	...props
}: EmojiPickerListCategoryHeaderProps) {
	return (
		<div
			{...props}
			className="bg-white px-1 pt-2 pb-1 text-muted text-xs leading-none dark:bg-ink"
		>
			{category.label}
		</div>
	);
}

/** A searchable emoji picker (grid grouped by category), shared by the row
 * context menu and the node detail header. */
export function EmojiPicker({
	value,
	onSelect,
	onClear,
}: {
	value: string | null;
	onSelect: (icon: string) => void;
	onClear: () => void;
}) {
	const labels = useOutlinerLabels();

	return (
		<EmojiPickerPrimitive.Root
			className="flex h-80 w-72 flex-col"
			onEmojiSelect={({ emoji }) => onSelect(emoji)}
			// Consuming apps self-host this under `public/emojibase-data/` so it
			// stays same-origin under a strict CSP `connect-src`, instead of the
			// default jsdelivr CDN.
			emojibaseUrl="/emojibase-data"
		>
			<div className="flex h-9 items-center gap-2 border-ink/10 border-b px-2 dark:border-surface/15">
				<MagnifyingGlassIcon size={14} weight="bold" className="text-muted" />
				<EmojiPickerPrimitive.Search
					placeholder={labels.iconPickerSearchPlaceholder}
					aria-label={labels.iconPickerSearchPlaceholder}
					className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted"
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
				/>
			</div>
			<EmojiPickerPrimitive.Viewport className="relative flex-1 outline-none">
				<EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-muted">
					<CircleNotchIcon
						size={16}
						className="animate-spin"
						aria-label={labels.iconPickerLoading}
					/>
				</EmojiPickerPrimitive.Loading>
				<EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-muted text-xs">
					{labels.iconPickerNoResults}
				</EmojiPickerPrimitive.Empty>
				<EmojiPickerPrimitive.List
					className="select-none pb-1"
					components={{
						Row: EmojiPickerRow,
						Emoji: EmojiPickerEmoji,
						CategoryHeader: EmojiPickerCategoryHeader,
					}}
				/>
			</EmojiPickerPrimitive.Viewport>
			{value && (
				<button
					type="button"
					className="flex items-center justify-center gap-1.5 border-ink/10 border-t py-1.5 text-muted text-xs hover:bg-ink/10 dark:border-surface/15 dark:hover:bg-surface/15"
					onClick={onClear}
				>
					<XIcon size={12} weight="bold" />
					{labels.removeIcon}
				</button>
			)}
		</EmojiPickerPrimitive.Root>
	);
}
