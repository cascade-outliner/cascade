import { Dialog, NumberField, Tabs } from "@base-ui/react";
import { type FontSizeId, fontSizes } from "@cascade/theme/font-sizes";
import { type FontId, fonts } from "@cascade/theme/fonts";
import { SYSTEM_THEME, themes } from "@cascade/theme/themes";
import { Button } from "@cascade/ui/button";
import { LanguageSwitcher } from "@cascade/ui/language-switcher";
import { Select } from "@cascade/ui/select";
import {
	ArrowSquareOutIcon,
	MinusIcon,
	PlusIcon,
	SignOutIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import {
	getLocale,
	type Locale,
	locales,
	setLocale,
} from "#/paraglide/runtime.js";
import type { Settings } from "@/core/settings/settings-patch-schema";
import { MAX_INDENT_SIZE, MIN_INDENT_SIZE } from "@/ui/settings-context";
import { Avatar } from "./Avatar";
import { PremiumTab } from "./PremiumTab";
import {
	iconButton,
	indentSizeInput,
	quickLinkItem,
	settingsDialogPopup,
	stepperButton,
	tabTrigger,
} from "./styles";
import type { UserMenuUser } from "./types";

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

/** The built-in light/dark palettes get translated labels; theme names are proper nouns. */
function themeLabel(theme: (typeof themes)[number]): string {
	if (theme.id === "light") return m.user_menu_theme_light();
	if (theme.id === "dark") return m.user_menu_theme_dark();
	return theme.label;
}

function themeOptions() {
	return [
		{ value: SYSTEM_THEME, label: m.user_menu_theme_sync_system() },
		...themes.map((theme) => ({ value: theme.id, label: themeLabel(theme) })),
	];
}

function lightThemeOptions() {
	return themes
		.filter((theme) => !theme.dark)
		.map((theme) => ({ value: theme.id, label: themeLabel(theme) }));
}

function darkThemeOptions() {
	return themes
		.filter((theme) => theme.dark)
		.map((theme) => ({ value: theme.id, label: themeLabel(theme) }));
}

function fontOptions() {
	const labels: Partial<Record<FontId, string>> = {
		"system-sans": m.user_menu_font_system_sans(),
		"system-serif": m.user_menu_font_system_serif(),
		"system-mono": m.user_menu_font_monospace(),
	};
	return fonts.map((font) => ({
		value: font.id,
		label: labels[font.id] ?? font.label,
	}));
}

function fontSizeOptions() {
	const labels: Record<FontSizeId, string> = {
		small: m.user_menu_font_size_small(),
		default: m.user_menu_font_size_default(),
		large: m.user_menu_font_size_large(),
		"extra-large": m.user_menu_font_size_extra_large(),
	};
	return fontSizes.map((fontSize) => ({
		value: fontSize.id,
		label: labels[fontSize.id],
	}));
}

export interface UserSettingsDialogProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSignOut: () => void;
	onOpenDeleteDialog: () => void;
}

export function UserSettingsDialog({
	user,
	settings,
	setSetting,
	open,
	onOpenChange,
	onSignOut,
	onOpenDeleteDialog,
}: UserSettingsDialogProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-surface/20 backdrop-blur-sm" />
				<Dialog.Popup className={settingsDialogPopup()}>
					<div className="mb-4 flex items-center justify-between">
						<Dialog.Title className="text-lg font-semibold">
							{m.user_menu_settings()}
						</Dialog.Title>
						<Dialog.Close
							aria-label={m.user_menu_close_settings()}
							className={iconButton()}
						>
							<XIcon size={16} weight="bold" />
						</Dialog.Close>
					</div>
					<Tabs.Root defaultValue="general">
						<Tabs.List className="mb-4 flex gap-4 border-b border-ink/10 dark:border-surface/15">
							<Tabs.Tab value="general" className={tabTrigger()}>
								{m.user_menu_general_tab()}
							</Tabs.Tab>
							<Tabs.Tab value="user" className={tabTrigger()}>
								{m.user_menu_user_tab()}
							</Tabs.Tab>
							<Tabs.Tab value="premium" className={tabTrigger()}>
								{m.user_menu_premium_tab()}
							</Tabs.Tab>
							<Tabs.Tab value="links" className={tabTrigger()}>
								{m.user_menu_quick_links()}
							</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel value="general">
							<div className="flex items-center justify-between text-sm">
								{m.user_menu_theme()}
								<Select
									aria-label={m.user_menu_theme()}
									options={themeOptions()}
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
											options={lightThemeOptions()}
											value={settings.lightTheme}
											onValueChange={(theme) => setSetting("lightTheme", theme)}
										/>
									</div>
									<div className="mt-3 flex items-center justify-between pl-4 text-sm">
										{m.user_menu_theme_dark_option()}
										<Select
											aria-label={m.user_menu_theme_dark_option()}
											options={darkThemeOptions()}
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
										if (value == null) return;
										const snapped =
											MIN_INDENT_SIZE +
											Math.round((value - MIN_INDENT_SIZE) / 2) * 2;
										setSetting(
											"indentSize",
											Math.min(
												Math.max(snapped, MIN_INDENT_SIZE),
												MAX_INDENT_SIZE,
											),
										);
									}}
								>
									<NumberField.Group className="flex items-center gap-1">
										<NumberField.Decrement className={stepperButton()}>
											<MinusIcon size={12} weight="bold" />
										</NumberField.Decrement>
										<NumberField.Input className={indentSizeInput()} />
										<NumberField.Increment className={stepperButton()}>
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
						</Tabs.Panel>
						<Tabs.Panel value="links">
							<a
								href={`${webUrl}/changelog`}
								target="_blank"
								rel="noreferrer"
								className={quickLinkItem()}
							>
								<ArrowSquareOutIcon size={14} weight="bold" />
								{m.user_menu_changelog_link()}
							</a>
						</Tabs.Panel>
						<Tabs.Panel value="user">
							<div className="flex items-center gap-3">
								<Avatar user={user} className="size-12" />
								<div className="min-w-0">
									<div className="truncate text-sm font-semibold">
										{user.name}
									</div>
									<div className="truncate text-sm text-ink/60 dark:text-surface/60">
										{user.email}
									</div>
								</div>
							</div>
							<div className="mt-4 flex items-center justify-between">
								<Button
									type="button"
									size="sm"
									variant="danger"
									onClick={onSignOut}
									icon={<SignOutIcon size={14} weight="bold" />}
								>
									{m.user_menu_sign_out()}
								</Button>
								<Button
									type="button"
									size="sm"
									variant="danger"
									onClick={onOpenDeleteDialog}
									icon={<TrashIcon size={14} weight="bold" />}
								>
									{m.user_menu_delete_account()}
								</Button>
							</div>
						</Tabs.Panel>
						<Tabs.Panel value="premium">
							<PremiumTab />
						</Tabs.Panel>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
