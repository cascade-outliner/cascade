import { Dialog } from "@base-ui/react";
import { ArrowUpRightIcon, ListIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { appLoginUrl } from "#/lib/app-url";
import { m } from "#/paraglide/messages.js";

function NavLinks() {
	return (
		<>
			<Link to="/changelog">{m.nav_changelog()}</Link>
			<a
				href={appLoginUrl}
				className="font-bold text-danger inline-flex items-center gap-2"
			>
				{m.nav_go_to_app()} <ArrowUpRightIcon size={24} />
			</a>
		</>
	);
}

export function Nav() {
	return (
		<nav className="mx-auto flex max-w-6xl items-center justify-between p-8">
			<Link
				to="/"
				className="font-serif text-2xl italic flex items-center gap-4"
			>
				<img width={48} height={48} alt={m.nav_logo_alt()} src="/logo192.png" />
				cascade
			</Link>
			<div className="hidden md:flex items-baseline gap-8 text-sm">
				<NavLinks />
			</div>
			<Dialog.Root>
				<Dialog.Trigger className="md:hidden" aria-label={m.nav_open_menu()}>
					<ListIcon size={28} />
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
					<Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col gap-8 bg-white p-8 shadow-lg transition-transform duration-150 data-starting-style:translate-x-full data-ending-style:translate-x-full">
						<Dialog.Close className="self-end" aria-label={m.nav_close_menu()}>
							<XIcon size={28} />
						</Dialog.Close>
						<div className="flex gap-6 text-sm flex-col-reverse">
							<NavLinks />
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</nav>
	);
}
