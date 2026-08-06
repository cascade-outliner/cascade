import { XIcon } from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

export interface TimePickerProps {
	/** `HH:MM` local time, or `null` for no time set. */
	value: string | null;
	onChange: (value: string | null) => void;
	clearAriaLabel?: string;
}

const field = cva({
	base: [
		"w-24 rounded-md border border-ink/15 bg-white px-2 py-1.5 text-sm outline-none",
		"dark:border-surface/20 dark:bg-ink dark:[color-scheme:dark]",
	],
});

const clearButton = cva({
	base: [
		"flex size-6 items-center justify-center rounded-md text-muted outline-none transition-colors",
		"hover:bg-surface/70 hover:text-ink",
		"dark:text-surface/80 dark:hover:bg-surface/20 dark:hover:text-surface",
	],
});

export function TimePicker({
	value,
	onChange,
	clearAriaLabel,
}: TimePickerProps) {
	return (
		<div className="flex items-center gap-2">
			<input
				type="time"
				step={60}
				value={value ?? ""}
				onChange={(event) => onChange(event.currentTarget.value || null)}
				onKeyDown={(event) => event.stopPropagation()}
				className={field()}
			/>
			{value !== null && (
				<button
					type="button"
					aria-label={clearAriaLabel}
					className={clearButton()}
					onClick={() => onChange(null)}
				>
					<XIcon size={13} weight="bold" />
				</button>
			)}
		</div>
	);
}
