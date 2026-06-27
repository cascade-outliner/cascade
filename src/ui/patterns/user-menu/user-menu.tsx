import { Avatar } from "@base-ui/react/avatar";
import { Menu } from "@base-ui/react/menu";

const NAV_ITEMS = [{ label: "Nodes", href: "/node" }];

export function UserMenu() {
	return (
		<div className="fixed top-8 right-8 z-50">
			<Menu.Root>
				<Menu.Trigger className="block cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-grey">
					<Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-full bg-redleather text-white text-sm font-semibold select-none">
						<Avatar.Fallback>USER</Avatar.Fallback>
					</Avatar.Root>
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="end" sideOffset={8}>
						<Menu.Popup className="z-50 min-w-40 rounded-xl border border-black/10 bg-white p-1 shadow-lg outline-none">
							{NAV_ITEMS.map(({ label, href }) => (
								<Menu.LinkItem
									key={href}
									href={href}
									className="flex items-center rounded-lg px-3 py-2 text-sm text-dark-grey cursor-pointer outline-none data-highlighted:bg-ginger"
								>
									{label}
								</Menu.LinkItem>
							))}
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</div>
	);
}
