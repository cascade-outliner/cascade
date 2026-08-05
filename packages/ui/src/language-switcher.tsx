import { Select } from "@base-ui/react/select";
import {
	CaretUpDownIcon,
	CheckIcon,
	GlobeIcon,
} from "@phosphor-icons/react/ssr";
import { cva } from "./cva.config";
import { overlayPopupMotion } from "./overlay-motion";

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
		"shadow-lg shadow-ink/15 outline-none",
		overlayPopupMotion,
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
	/**
	 * Accessible name for the trigger. `role="combobox"` takes its name from
	 * the author, not its content, so the visible `Select.Value` text alone
	 * doesn't give it one — the caller supplies this from its own message
	 * catalog, same as `@cascade/ui/select.tsx`'s `Select`.
	 */
	"aria-label"?: string;
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
	"aria-label": ariaLabel,
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
			<Select.Trigger aria-label={ariaLabel} className={trigger({ className })}>
				<GlobeIcon size={14} weight="bold" aria-hidden="true" />
				<Select.Value />
				<Select.Icon>
					<CaretUpDownIcon size={12} weight="bold" />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
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
