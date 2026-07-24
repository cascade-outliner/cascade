import { NumberField } from "@base-ui/react";
import {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
	type Settings,
} from "@cascade/api/settings-schema";
import { SYSTEM_THEME } from "@cascade/theme/themes";
import { LanguageSwitcher } from "@cascade/ui/language-switcher";
import { Select } from "@cascade/ui/select";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import {
	getLocale,
	type Locale,
	locales,
	setLocale,
} from "#/paraglide/runtime.js";
import {
	darkThemeOptions,
	fontOptions,
	fontSizeOptions,
	lightThemeOptions,
	themeOptions,
} from "./settings-options";

interface AppearanceSettingsPanelProps {
	settings: Settings;
	isPremium: boolean;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const stepperClass =
	"flex size-6 cursor-pointer items-center justify-center rounded-md text-ink outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-danger/50 disabled:cursor-default disabled:opacity-40 dark:text-surface dark:hover:bg-surface/20";
const indentInputClass =
	"w-8 rounded-md bg-ink/10 py-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-danger/50 dark:bg-surface/10";

function normalizeIndentSize(value: number): number {
	const snapped =
		MIN_INDENT_SIZE + Math.round((value - MIN_INDENT_SIZE) / 2) * 2;
	return Math.min(Math.max(snapped, MIN_INDENT_SIZE), MAX_INDENT_SIZE);
}

export function AppearanceSettingsPanel({
	settings,
	isPremium,
	setSetting,
}: AppearanceSettingsPanelProps) {
	return (
		<>
			<div className="flex items-center justify-between text-sm">
				{m.user_menu_theme()}
				<Select
					aria-label={m.user_menu_theme()}
					options={themeOptions(isPremium)}
					value={settings.theme}
					onValueChange={(theme) => setSetting("theme", theme)}
				/>
			</div>
			{settings.theme === SYSTEM_THEME && (
				<>
					<div className="mt-3 flex items-center justify-between pl-4 text-sm">
						{m.user_menu_theme_light_option()}
						<Select
							aria-label={m.user_menu_theme_light_option()}
							options={lightThemeOptions(isPremium)}
							value={settings.lightTheme}
							onValueChange={(theme) => setSetting("lightTheme", theme)}
						/>
					</div>
					<div className="mt-3 flex items-center justify-between pl-4 text-sm">
						{m.user_menu_theme_dark_option()}
						<Select
							aria-label={m.user_menu_theme_dark_option()}
							options={darkThemeOptions(isPremium)}
							value={settings.darkTheme}
							onValueChange={(theme) => setSetting("darkTheme", theme)}
						/>
					</div>
				</>
			)}
			<div className="mt-3 flex items-center justify-between text-sm">
				{m.user_menu_font()}
				<Select
					aria-label={m.user_menu_font()}
					options={fontOptions()}
					value={settings.font}
					onValueChange={(font) => setSetting("font", font)}
				/>
			</div>
			<div className="mt-3 flex items-center justify-between text-sm">
				{m.user_menu_font_size()}
				<Select
					aria-label={m.user_menu_font_size()}
					options={fontSizeOptions()}
					value={settings.fontSize}
					onValueChange={(fontSize) => setSetting("fontSize", fontSize)}
				/>
			</div>
			<div className="mt-3 flex items-center justify-between text-sm">
				{m.user_menu_indent_size()}
				<NumberField.Root
					aria-label={m.user_menu_indent_size()}
					value={settings.indentSize}
					min={MIN_INDENT_SIZE}
					max={MAX_INDENT_SIZE}
					step={2}
					snapOnStep
					onValueChange={(value) => {
						if (value != null) {
							setSetting("indentSize", normalizeIndentSize(value));
						}
					}}
				>
					<NumberField.Group className="flex items-center gap-1">
						<NumberField.Decrement className={stepperClass}>
							<MinusIcon size={12} weight="bold" />
						</NumberField.Decrement>
						<NumberField.Input className={indentInputClass} />
						<NumberField.Increment className={stepperClass}>
							<PlusIcon size={12} weight="bold" />
						</NumberField.Increment>
					</NumberField.Group>
				</NumberField.Root>
			</div>
			<div className="mt-3 flex items-center justify-between text-sm">
				{m.user_menu_language()}
				<LanguageSwitcher
					locales={locales}
					currentLocale={getLocale()}
					onSelect={(locale) => setLocale(locale as Locale)}
				/>
			</div>
		</>
	);
}
