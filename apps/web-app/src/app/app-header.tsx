import { HouseIcon } from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { m } from "#/paraglide/messages.js";
import { Agenda } from "@/features/agenda/ui/agenda";
import { QuickOpen } from "@/features/quick-open/ui/quick-open";
import { UserMenu } from "@/features/user-menu/ui/user-menu";
import { actionsDock, bar, brand, dockItem } from "./app-header.styles";
import { HeaderWayfinding } from "./header-wayfinding";

type PanelId = "agenda" | "quick-open";

export function AppHeader() {
	const [activePanel, setActivePanel] = useState<PanelId | null>(null);

	const handleActiveChange = (id: PanelId) => (active: boolean) =>
		setActivePanel((current) =>
			active ? id : current === id ? null : current,
		);

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
				<Link
					to="/"
					onClick={() => setActivePanel(null)}
					aria-label={m.breadcrumbs_home_label()}
					className={`${dockItem()} sm:hidden`}
				>
					<HouseIcon size={19} weight="bold" />
					<span className="text-[11px] font-semibold leading-none">
						{m.breadcrumbs_home_label()}
					</span>
				</Link>
				<Agenda
					isActive={activePanel === "agenda"}
					onActiveChange={handleActiveChange("agenda")}
				/>
				<QuickOpen
					isActive={activePanel === "quick-open"}
					onActiveChange={handleActiveChange("quick-open")}
				/>
				<UserMenu />
			</div>
		</header>
	);
}
