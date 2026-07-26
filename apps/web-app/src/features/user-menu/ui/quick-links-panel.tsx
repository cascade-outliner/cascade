import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import {
	SettingsPageDescription,
	SettingsSection,
} from "@/features/settings/ui/settings-panel";
import { quickLinkItem } from "./user-menu.styles";

const webUrl = import.meta.env.VITE_WEB_URL ?? "https://cascadelist.com";

export function QuickLinksPanel() {
	return (
		<>
			<SettingsPageDescription>
				{m.settings_resources_description()}
			</SettingsPageDescription>
			<SettingsSection title={m.settings_cascade_section()}>
				<a
					href={`${webUrl}/changelog`}
					target="_blank"
					rel="noreferrer"
					className={quickLinkItem()}
				>
					<div>
						<div className="font-medium">{m.user_menu_changelog_link()}</div>
						<div className="mt-0.5 text-ink/55 dark:text-surface/55">
							{m.settings_changelog_description()}
						</div>
					</div>
					<ArrowSquareOutIcon size={18} weight="bold" />
				</a>
			</SettingsSection>
		</>
	);
}
