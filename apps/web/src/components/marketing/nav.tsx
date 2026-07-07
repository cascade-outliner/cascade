import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";

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
			<div className="flex items-baseline gap-8 text-sm">
				<Link to="/changelog">Changelog</Link>
				<a
					href="https://app.cascadelist.com/"
					className="font-bold text-redleather inline-flex items-center gap-2"
				>
					Open app <ArrowUpRightIcon size={24} />
				</a>
			</div>
		</nav>
	);
}
