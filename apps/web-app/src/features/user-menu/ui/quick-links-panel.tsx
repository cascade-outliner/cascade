import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import { quickLinkItem } from "./user-menu.styles";

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

export function QuickLinksPanel() {
	return (
		<a
			href={`${webUrl}/changelog`}
			target="_blank"
			rel="noreferrer"
			className={quickLinkItem()}
		>
			<ArrowSquareOutIcon size={14} weight="bold" />
			{m.user_menu_changelog_link()}
		</a>
	);
}
