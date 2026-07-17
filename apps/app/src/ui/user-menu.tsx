import {
	AlertDialog,
	Dialog,
	Menu,
	NumberField,
	Switch,
	Tabs,
} from "@base-ui/react";
import { authClient } from "@cascade/auth/client";
import { cva } from "@cascade/ui/cva.config";
import { LanguageSwitcher } from "@cascade/ui/language-switcher";
import { toast } from "@cascade/ui/toast";
import {
	GearIcon,
	MinusIcon,
	PlusIcon,
	SignOutIcon,
	TrashIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { m } from "#/paraglide/messages.js";
import {
	getLocale,
	type Locale,
	locales,
	setLocale,
} from "#/paraglide/runtime.js";
import { changelogEntries, latestChangelogId } from "@/changelog";
import {
	MAX_INDENT_SIZE,
	MIN_INDENT_SIZE,
	useSettings,
} from "@/ui/settings-context";

const stepperButton = cva({
	base: [
		"flex size-6 cursor-pointer items-center justify-center rounded-md text-dark-grey outline-none",
		"hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40",
		"dark:text-ginger dark:hover:bg-ginger/20",
	],
});

const popup = cva({
	base: [
		"min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger",
		"shadow-lg shadow-dark-grey/15",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 data-disabled:cursor-default data-disabled:opacity-40 dark:data-highlighted:bg-ginger/20",
	],
});

const tabTrigger = cva({
	base: [
		"cursor-pointer border-b-2 border-transparent px-1 pb-2 text-sm text-dark-grey/60 outline-none",
		"hover:text-dark-grey data-active:border-redleather data-active:text-dark-grey",
		"dark:text-ginger/60 dark:hover:text-ginger dark:data-active:text-ginger",
	],
});

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
	user: { name: string; email: string; image?: string | null };
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

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

export function UserMenu() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { settings, setSetting, saveSettings } = useSettings();
	const { user } = useRouteContext({ from: "__root__" });
	const hasUnseenChangelog = settings.lastSeenChangelogId !== latestChangelogId;

	async function handleSignOut() {
		await authClient.signOut();
		window.location.href = `${webUrl}/login`;
	}

	async function handleDeleteAccount() {
		setIsDeleting(true);
		const { error } = await authClient.deleteUser();
		setIsDeleting(false);
		if (error) {
			toast.error(error.message ?? m.user_menu_delete_failed());
			return;
		}
		window.location.href = `${webUrl}/login`;
	}

	return (
		<div className="fixed top-4 right-8 z-50">
			<Menu.Root>
				<Menu.Trigger
					aria-label={m.user_menu_trigger_label()}
					className="flex size-12 cursor-pointer items-center justify-center rounded-full border border-dark-grey/10 bg-white text-dark-grey shadow-md shadow-dark-grey/15 outline-none select-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:bg-ginger/70 dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger dark:hover:bg-dark-grey dark:data-popup-open:bg-dark-grey"
				>
					<Avatar user={user} className="size-10" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner
						className="z-50 outline-none"
						align="end"
						sideOffset={6}
					>
						<Menu.Popup className={popup()}>
							<Menu.Item
								className={item()}
								onClick={() => setSettingsOpen(true)}
							>
								<GearIcon size={14} weight="bold" />
								{m.user_menu_settings()}
								{hasUnseenChangelog && (
									<span
										aria-hidden="true"
										className="ml-auto size-1.5 rounded-full bg-redleather"
									/>
								)}
							</Menu.Item>
							<Menu.Item className={item()} onClick={handleSignOut}>
								<SignOutIcon size={14} weight="bold" />
								{m.user_menu_sign_out()}
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Dialog.Root
				open={settingsOpen}
				onOpenChange={(open) => {
					setSettingsOpen(open);
					if (!open) saveSettings();
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm" />
					<Dialog.Popup className="fixed inset-0 top-1/2 left-1/2 z-50 h-full w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-0 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none sm:right-auto sm:bottom-auto sm:h-auto sm:rounded-lg sm:border sm:border-dark-grey/10 dark:bg-dark-grey dark:text-ginger sm:dark:border-ginger/15">
						<div className="mb-4 flex items-center justify-between">
							<Dialog.Title className="text-lg font-semibold">
								{m.user_menu_settings()}
							</Dialog.Title>
							<Dialog.Close
								aria-label={m.user_menu_close_settings()}
								className="cursor-pointer rounded-md p-1 outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20"
							>
								<XIcon size={16} weight="bold" />
							</Dialog.Close>
						</div>
						<Tabs.Root
							defaultValue="general"
							onValueChange={(value) => {
								if (value === "changelog") {
									setSetting("lastSeenChangelogId", latestChangelogId);
								}
							}}
						>
							<Tabs.List className="mb-4 flex gap-4 border-b border-dark-grey/10 dark:border-ginger/15">
								<Tabs.Tab value="general" className={tabTrigger()}>
									{m.user_menu_general_tab()}
								</Tabs.Tab>
								<Tabs.Tab value="user" className={tabTrigger()}>
									{m.user_menu_user_tab()}
								</Tabs.Tab>
								<Tabs.Tab value="changelog" className={tabTrigger()}>
									{m.user_menu_changelog_tab()}
									{hasUnseenChangelog && (
										<span
											aria-hidden="true"
											className="ml-1.5 inline-block size-1.5 rounded-full bg-redleather"
										/>
									)}
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
									onClick={handleSignOut}
									className="mt-4 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-redleather outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20"
								>
									<SignOutIcon size={14} weight="bold" />
									{m.user_menu_sign_out()}
								</button>
								<button
									type="button"
									onClick={() => setDeleteDialogOpen(true)}
									className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-redleather outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/20"
								>
									<TrashIcon size={14} weight="bold" />
									{m.user_menu_delete_account()}
								</button>
							</Tabs.Panel>
							<Tabs.Panel
								value="changelog"
								className="max-h-[60vh] overflow-y-auto sm:max-h-80"
							>
								{changelogEntries.map((entry) => (
									<div key={entry.id} className="mb-4 last:mb-0">
										<h3 className="mb-1 text-xs font-semibold text-dark-grey/60 dark:text-ginger/60">
											{entry.id}
										</h3>
										<div
											className="prose prose-sm dark:prose-invert max-w-none"
											// biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the repo (CHANGELOG.md), not user input
											dangerouslySetInnerHTML={{ __html: entry.html }}
										/>
									</div>
								))}
							</Tabs.Panel>
						</Tabs.Root>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<AlertDialog.Root
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<AlertDialog.Portal>
					<AlertDialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm" />
					<AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dark-grey/10 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 outline-none dark:border-ginger/15 dark:bg-dark-grey dark:text-ginger">
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
								className="cursor-pointer rounded-md px-3 py-1.5 text-sm outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40 dark:hover:bg-ginger/20"
							>
								{m.user_menu_cancel()}
							</AlertDialog.Close>
							<button
								type="button"
								onClick={handleDeleteAccount}
								disabled={isDeleting}
								className="cursor-pointer rounded-md bg-redleather px-3 py-1.5 text-sm text-super-ginger outline-none hover:bg-redleather/90 focus-visible:ring-2 focus-visible:ring-redleather/50 disabled:cursor-default disabled:opacity-40"
							>
								{isDeleting
									? m.user_menu_deleting()
									: m.user_menu_delete_account()}
							</button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</div>
	);
}
