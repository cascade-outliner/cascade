import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { QuickOpen } from "@/features/quick-open/ui/quick-open";
import { UserMenu } from "@/features/user-menu/ui/user-menu";
import { bar, brand, navLink } from "./app-header.styles";

export function AppHeader() {
	return (
		<div className={bar()}>
			<Link to="/" className={brand()}>
				<img
					width={28}
					height={28}
					alt={m.header_logo_alt()}
					src="/logo192.png"
				/>
			</Link>

			<Link
				to="/agenda"
				aria-label={m.header_agenda_link()}
				className={navLink()}
			>
				<CalendarIcon size={20} weight="bold" />
			</Link>

			<div className="ml-auto flex shrink-0 items-center gap-2">
				<QuickOpen />
				<UserMenu />
			</div>
		</div>
	);
}
