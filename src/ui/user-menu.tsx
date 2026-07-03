import { Dialog, Menu } from "@base-ui/react";
import { GearIcon, UserCircleIcon, XIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { cva } from "@/integrations/cva/cva.config";

const popup = cva({
	base: [
		"origin-(--transform-origin) min-w-40 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey",
		"shadow-lg shadow-dark-grey/15 transition-[transform,opacity] duration-150 ease-out",
		"data-starting-style:scale-95 data-starting-style:opacity-0",
		"data-ending-style:scale-95 data-ending-style:opacity-0",
		"outline-none",
	],
});

const item = cva({
	base: [
		"flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 data-disabled:cursor-default data-disabled:opacity-40",
	],
});

const field = cva({
	base: [
		"w-full rounded-md border border-dark-grey/10 bg-white px-3 py-1.5 text-sm text-dark-grey",
		"outline-none focus-visible:ring-2 focus-visible:ring-redleather/50",
	],
});

export function UserMenu() {
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<div className="fixed top-4 right-4 z-50">
			<Menu.Root>
				<Menu.Trigger
					aria-label="User menu"
					className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-dark-grey/10 bg-white text-dark-grey shadow-md shadow-dark-grey/15 outline-none select-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50 data-popup-open:bg-ginger/70"
				>
					<UserCircleIcon size={22} weight="bold" />
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
								Settings
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-ginger/20 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-300 data-starting-style:opacity-0 data-starting-style:backdrop-blur-none data-ending-style:opacity-0 data-ending-style:backdrop-blur-none data-ending-style:duration-150" />
					<Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 scale-100 rounded-lg border border-dark-grey/10 bg-white p-6 text-dark-grey shadow-lg shadow-dark-grey/15 transition-[transform,opacity,scale] duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-out">
						<div className="mb-4 flex items-center justify-between">
							<Dialog.Title className="text-lg font-semibold">
								Settings
							</Dialog.Title>
							<Dialog.Close
								aria-label="Close settings"
								className="cursor-pointer rounded-md p-1 outline-none hover:bg-ginger/70 focus-visible:ring-2 focus-visible:ring-redleather/50"
							>
								<XIcon size={16} weight="bold" />
							</Dialog.Close>
						</div>

						{/* ponytail: mocked settings, no state or persistence yet */}
						<div className="flex flex-col gap-4">
							<label className="flex flex-col gap-1 text-sm font-medium">
								Display name
								<input
									type="text"
									defaultValue="Anonymous"
									className={field()}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm font-medium">
								Theme
								<select className={field()} defaultValue="system">
									<option value="system">System</option>
									<option value="light">Light</option>
									<option value="dark">Dark</option>
								</select>
							</label>
							<fieldset className="flex flex-col gap-2 text-sm">
								<legend className="mb-1 font-medium">Notifications</legend>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										defaultChecked
										className="accent-redleather"
									/>
									Email notifications
								</label>
								<label className="flex items-center gap-2">
									<input type="checkbox" className="accent-redleather" />
									Weekly digest
								</label>
							</fieldset>
							<button
								type="button"
								disabled
								className="mt-2 cursor-not-allowed self-end rounded-md bg-redleather px-4 py-1.5 text-sm font-medium text-white opacity-50"
							>
								Save
							</button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
