import { Dialog, NumberField, Switch, Tabs } from "@base-ui/react";
import { LanguageSwitcher } from "@cascade/ui/language-switcher";
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
import {
	dangerMenuItem,
	iconButton,
	indentSizeInput,
	quickLinkItem,
	settingsDialogPopup,
	settingsSwitch,
	stepperButton,
	tabTrigger,
} from "./styles";
import type { UserMenuUser } from "./types";

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

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
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm" />
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
						<Tabs.List className="mb-4 flex gap-4 border-b border-dark-grey/10 dark:border-ginger/15">
							<Tabs.Tab value="general" className={tabTrigger()}>
								{m.user_menu_general_tab()}
							</Tabs.Tab>
							<Tabs.Tab value="user" className={tabTrigger()}>
								{m.user_menu_user_tab()}
							</Tabs.Tab>
							<Tabs.Tab value="links" className={tabTrigger()}>
								{m.user_menu_quick_links()}
							</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel value="general">
							<div className="flex items-center justify-between text-sm">
								{m.user_menu_dark_mode()}
								<Switch.Root
									aria-label={m.user_menu_dark_mode()}
									checked={settings.dark}
									onCheckedChange={(next) => setSetting("dark", next)}
									className={settingsSwitch()}
								>
									<Switch.Thumb className="block size-4 rounded-full bg-white data-checked:translate-x-4" />
								</Switch.Root>
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
									<div className="truncate text-sm text-dark-grey/60 dark:text-ginger/60">
										{user.email}
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={onSignOut}
								className={dangerMenuItem({ spacing: "loose" })}
							>
								<SignOutIcon size={14} weight="bold" />
								{m.user_menu_sign_out()}
							</button>
							<button
								type="button"
								onClick={onOpenDeleteDialog}
								className={dangerMenuItem({ spacing: "tight" })}
							>
								<TrashIcon size={14} weight="bold" />
								{m.user_menu_delete_account()}
							</button>
						</Tabs.Panel>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
