import {
	AlertDialog,
	Dialog,
	Menu,
	NumberField,
	Switch,
	Tabs,
} from "@base-ui/react";
import { LanguageSwitcher } from "@cascade/ui/language-switcher";
import {
	ArrowSquareOutIcon,
	GearIcon,
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
import {
	alertPopup,
	avatarTrigger,
	dangerMenuItem,
	destructiveButton,
	iconButton,
	menuItem,
	menuPopup,
	quickLinkItem,
	secondaryButton,
	settingsDialogPopup,
	stepperButton,
	tabTrigger,
} from "./styles";
import type { UserMenuUser } from "./types";

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

function initials(name: string, email: string): string {
	const source = name.trim() || email;
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
}

function Avatar({
	user,
	className,
}: {
	user: UserMenuUser;
	className?: string;
}) {
	if (user.image) {
		return (
			<img
				src={user.image}
				alt=""
				referrerPolicy="no-referrer"
				className={`rounded-full object-cover ${className ?? ""}`}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`flex items-center justify-center rounded-full bg-redleather/10 text-xs font-semibold text-redleather ${className ?? ""}`}
		>
			{initials(user.name, user.email)}
		</span>
	);
}

export interface UserMenuViewProps {
	user: UserMenuUser;
	settings: Settings;
	setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
	settingsOpen: boolean;
	onSettingsOpenChange: (open: boolean) => void;
	onOpenSettings: () => void;
	deleteDialogOpen: boolean;
	onDeleteDialogOpenChange: (open: boolean) => void;
	onOpenDeleteDialog: () => void;
	onSignOut: () => void;
	onDeleteAccount: () => void;
	isDeleting: boolean;
}

export function UserMenuView({
	user,
	settings,
	setSetting,
	settingsOpen,
	onSettingsOpenChange,
	onOpenSettings,
	deleteDialogOpen,
	onDeleteDialogOpenChange,
	onOpenDeleteDialog,
	onSignOut,
	onDeleteAccount,
	isDeleting,
}: UserMenuViewProps) {
	return (
		<>
			<Menu.Root>
				<Menu.Trigger
					aria-label={m.user_menu_trigger_label()}
					className={avatarTrigger()}
				>
					<Avatar user={user} className="size-10" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner
						className="z-50 outline-none"
						align="end"
						sideOffset={6}
					>
						<Menu.Popup className={menuPopup()}>
							<Menu.Item className={menuItem()} onClick={onOpenSettings}>
								<GearIcon size={14} weight="bold" />
								{m.user_menu_settings()}
							</Menu.Item>
							<Menu.Item className={menuItem()} onClick={onSignOut}>
								<SignOutIcon size={14} weight="bold" />
								{m.user_menu_sign_out()}
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Dialog.Root open={settingsOpen} onOpenChange={onSettingsOpenChange}>
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
										className="h-5 w-9 cursor-pointer rounded-full bg-dark-grey/20 p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 data-checked:bg-redleather dark:bg-ginger/20"
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
											<NumberField.Input className="w-8 rounded-md bg-dark-grey/10 py-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-redleather/50 dark:bg-ginger/10" />
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

			<AlertDialog.Root
				open={deleteDialogOpen}
				onOpenChange={onDeleteDialogOpenChange}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm" />
					<AlertDialog.Popup className={alertPopup()}>
						<AlertDialog.Title className="text-lg font-semibold">
							{m.user_menu_delete_account()}
						</AlertDialog.Title>
						<AlertDialog.Description className="mt-2 text-sm text-dark-grey dark:text-ginger">
							{m.user_menu_delete_confirm_body()}
							<p className="text-redleather font-medium pt-4">
								{m.user_menu_delete_confirm_warning()}
							</p>
						</AlertDialog.Description>
						<div className="mt-6 flex justify-end gap-2">
							<AlertDialog.Close
								disabled={isDeleting}
								className={secondaryButton()}
							>
								{m.user_menu_cancel()}
							</AlertDialog.Close>
							<button
								type="button"
								onClick={onDeleteAccount}
								disabled={isDeleting}
								className={destructiveButton()}
							>
								{isDeleting
									? m.user_menu_deleting()
									: m.user_menu_delete_account()}
							</button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</>
	);
}
