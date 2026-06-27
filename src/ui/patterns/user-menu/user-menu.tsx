import { Avatar } from "@base-ui/react/avatar";
import { Menu } from "@base-ui/react/menu";
import { authClient } from "#/integrations/better-auth/auth-client";

const NAV_ITEMS = [{ label: "Nodes", href: "/node" }];

export function UserMenu() {
	const { data: session } = authClient.useSession();
	const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? "?";

	return (
		<div className="fixed top-8 right-8 z-50">
			<Menu.Root>
				<Menu.Trigger className="block cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-grey">
					<Avatar.Root className="flex h-12 w-12 items-center justify-center rounded-full bg-redleather text-white text-sm font-semibold select-none">
						<Avatar.Fallback>{initials}</Avatar.Fallback>
					</Avatar.Root>
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="end" sideOffset={8}>
						<Menu.Popup className="z-50 min-w-40 rounded-xl border border-black/10 bg-white p-1 shadow-lg outline-none">
							{session?.user && (
								<div className="px-3 py-2 text-xs text-dark-grey/50 border-b border-black/5 mb-1">
									{session.user.name}
								</div>
							)}
							{session?.user &&
								NAV_ITEMS.map(({ label, href }) => (
									<Menu.LinkItem
										key={href}
										href={href}
										className="flex items-center rounded-lg px-3 py-2 text-sm text-dark-grey cursor-pointer outline-none data-highlighted:bg-ginger"
									>
										{label}
									</Menu.LinkItem>
								))}
							{session ? (
								<Menu.Item
									className="flex items-center rounded-lg px-3 py-2 text-sm text-dark-grey cursor-pointer outline-none data-highlighted:bg-ginger"
									onClick={() => authClient.signOut()}
								>
									Sign out
								</Menu.Item>
							) : (
								<Menu.LinkItem
									href="/auth/sign-in"
									className="flex items-center rounded-lg px-3 py-2 text-sm text-dark-grey cursor-pointer outline-none data-highlighted:bg-ginger"
								>
									Sign in
								</Menu.LinkItem>
							)}
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</div>
	);
}
