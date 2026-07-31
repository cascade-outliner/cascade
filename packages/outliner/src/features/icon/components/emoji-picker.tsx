import { XIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import { isSingleEmoji } from "../../../nodes/model/emoji";

const QUICK_PICK_EMOJI = [
	"📌",
	"⭐",
	"🔥",
	"💡",
	"✅",
	"❗",
	"📁",
	"🚀",
	"📝",
	"🎯",
	"📅",
	"💬",
	"🔗",
	"❤️",
	"⚠️",
	"🏷️",
];

/** A grid of common emoji plus a free-form input for pasting any other
 * emoji, shared by the row context menu and the node detail header. */
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
	const [draft, setDraft] = useState("");

	return (
		<div className="w-56 p-1">
			<input
				value={draft}
				placeholder={labels.iconPickerCustomPlaceholder}
				aria-label={labels.iconPickerCustomPlaceholder}
				className="mb-2 w-full rounded-md border border-ink/15 bg-white px-2 py-1.5 text-sm outline-none dark:border-surface/20 dark:bg-ink"
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
				onChange={(event) => {
					const next = event.target.value;
					setDraft(next);
					if (isSingleEmoji(next)) {
						onSelect(next.trim());
						setDraft("");
					}
				}}
			/>
			<div className="grid grid-cols-8 gap-1">
				{QUICK_PICK_EMOJI.map((emoji) => (
					<button
						key={emoji}
						type="button"
						aria-label={emoji}
						aria-pressed={value === emoji}
						className={`flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-ink/10 dark:hover:bg-surface/15 ${
							value === emoji ? "bg-ink/10 dark:bg-surface/15" : ""
						}`}
						onClick={() => onSelect(emoji)}
					>
						{emoji}
					</button>
				))}
			</div>
			{value && (
				<button
					type="button"
					className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted hover:bg-ink/10 dark:hover:bg-surface/15"
					onClick={onClear}
				>
					<XIcon size={12} weight="bold" />
					{labels.removeIcon}
				</button>
			)}
		</div>
	);
}
