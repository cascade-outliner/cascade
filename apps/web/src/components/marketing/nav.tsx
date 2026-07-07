import { Dialog } from "@base-ui/react";
import { ArrowUpRightIcon, ListIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { appUrl } from "#/lib/app-url";

function NavLinks() {
	return (
		<>
			<Link to="/changelog">Changelog</Link>
			<Link to="/login">Log in</Link>
			<a
				href={appUrl}
				className="font-bold text-redleather inline-flex items-center gap-2"
			>
				Open app <ArrowUpRightIcon size={24} />
			</a>
		</>
	);
}

export function Nav() {
	return (
		<nav className="mx-auto flex max-w-6xl items-center justify-between p-8">
			<a
				href="/"
				className="font-serif text-2xl italic flex items-center gap-4"
			>
				<img width={48} height={48} alt="Cascade Logo" src="/logo192.png" />
				cascade
			</a>
			<div className="hidden md:flex items-baseline gap-8 text-sm">
				<NavLinks />
			</div>
			<Dialog.Root>
				<Dialog.Trigger className="md:hidden" aria-label="Open menu">
					<ListIcon size={28} />
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 z-50 bg-dark-grey/40 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
					<Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col gap-8 bg-white p-8 shadow-lg transition-transform duration-150 data-starting-style:translate-x-full data-ending-style:translate-x-full">
						<Dialog.Close className="self-end" aria-label="Close menu">
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
