import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { Agenda } from "@/features/agenda/ui/agenda";
import { QuickOpen } from "@/features/quick-open/ui/quick-open";
import { UserMenu } from "@/features/user-menu/ui/user-menu";
import { bar, brand } from "./app-header.styles";

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

			<Agenda />

			<div className="ml-auto flex shrink-0 items-center gap-2">
				<QuickOpen />
				<UserMenu />
			</div>
		</div>
	);
}
