import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { Agenda } from "@/features/agenda/ui/agenda";
import { QuickOpen } from "@/features/quick-open/ui/quick-open";
import { UserMenu } from "@/features/user-menu/ui/user-menu";
import { actionsDock, bar, brand } from "./app-header.styles";
import { HeaderWayfinding } from "./header-wayfinding";

export function AppHeader() {
	return (
		<header className={bar()}>
			<Link to="/" className={brand()}>
				<img
					width={28}
					height={28}
					alt={m.header_logo_alt()}
					src="/logo192.png"
				/>
			</Link>

			<HeaderWayfinding />

			<div className={actionsDock()}>
				<Agenda />
				<QuickOpen />
				<UserMenu />
			</div>
		</header>
	);
}
