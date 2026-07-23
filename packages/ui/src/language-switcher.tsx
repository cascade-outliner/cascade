import { Select } from "@base-ui/react/select";
import {
	CaretUpDownIcon,
	CheckIcon,
	GlobeIcon,
} from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";

const trigger = cva({
	base: [
		"flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-none",
		"hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 data-popup-open:bg-surface/70",
		"dark:hover:bg-surface/20 dark:data-popup-open:bg-surface/20",
	],
});

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-32 rounded-lg border border-ink/10 bg-white p-1 text-ink dark:border-surface/15 dark:bg-ink dark:text-surface",
		"shadow-lg shadow-ink/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-surface/70 dark:data-highlighted:bg-surface/20",
	],
});

export interface LanguageSwitcherProps {
	/** BCP-47 locale codes to offer, e.g. `["en", "nl"]`. */
	locales: readonly string[];
	/** The currently active locale. */
	currentLocale: string;
	/** Called with the newly selected locale code. */
	onSelect: (locale: string) => void;
	className?: string;
}

/**
 * A locale picker with no dependency on any particular app's message
 * catalog: language names are derived from `Intl.DisplayNames`, and the
 * actual locale switch (cookie/URL/reload) is left to the caller via
 * `onSelect`, since that's app-specific (see each app's paraglide runtime).
 */
export function LanguageSwitcher({
	locales,
	currentLocale,
	onSelect,
	className,
}: LanguageSwitcherProps) {
	const displayNames = new Intl.DisplayNames([currentLocale], {
		type: "language",
	});
	const labelFor = (locale: string) => displayNames.of(locale) ?? locale;

	return (
		<Select.Root
			items={locales.map((locale) => ({
				value: locale,
				label: labelFor(locale),
			}))}
			value={currentLocale}
			onValueChange={(value) => {
				if (value) onSelect(value);
			}}
		>
			<Select.Trigger className={trigger({ className })}>
				<GlobeIcon size={14} weight="bold" />
				<Select.Value />
				<Select.Icon>
					<CaretUpDownIcon size={12} weight="bold" />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				{/* z-60: must outrank the app's z-50 dialogs/menus when nested inside one.
				alignItemWithTrigger (on by default) overlaps the popup with the trigger so
				the selected item lines up with it, ignoring sideOffset/align - and only
				falls back to plain anchored positioning for touch opens, so opening the
				same dropdown with a mouse vs. a finger renders it in two different places.
				We want one consistent, predictable position everywhere, so opt out. */}
				<Select.Positioner
					sideOffset={6}
					align="end"
					alignItemWithTrigger={false}
					className="z-[60]"
				>
					<Select.Popup className={popup()}>
						<Select.List>
							{locales.map((locale) => (
								<Select.Item key={locale} value={locale} className={item()}>
									<Select.ItemIndicator>
										<CheckIcon size={14} weight="bold" />
									</Select.ItemIndicator>
									<Select.ItemText>{labelFor(locale)}</Select.ItemText>
								</Select.Item>
							))}
						</Select.List>
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}
