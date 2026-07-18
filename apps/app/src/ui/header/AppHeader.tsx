import { Menu } from "@base-ui/react";
import {
	DotsThreeIcon,
	FlagIcon,
	MagnifyingGlassIcon,
	MoonIcon,
	PlusIcon,
	ShareNetworkIcon,
	SunIcon,
	TextAaIcon,
} from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { useSettings } from "@/ui/settings-context";
import { UserMenu } from "@/ui/user-menu";
import {
	bar,
	brand,
	brandMark,
	iconButton,
	menuItem,
	menuPopup,
	newTreeButton,
	searchBox,
	searchInput,
	soonBadge,
	treeTab,
	treeTabs,
} from "./styles";

/**
 * Multiple trees (#218) and sharing (#170-172) don't have a backend yet, so
 * the tree tab strip and share entry render as a single fixed tab / disabled
 * action rather than being wired to real data.
 */
export function AppHeader() {
	const { settings, setSetting, saveSettings } = useSettings();

	function toggleTheme() {
		setSetting("dark", !settings.dark);
		saveSettings();
	}

	return (
		<>
			<div className={bar()}>
				<Link to="/" aria-label={m.header_brand_label()} className={brand()}>
					<span aria-hidden="true" className={brandMark()} />
					Cascade
				</Link>

				<label className={searchBox()}>
					<MagnifyingGlassIcon size={15} weight="bold" className="shrink-0" />
					<input
						type="search"
						className={searchInput()}
						placeholder={m.header_search_placeholder()}
						disabled
						title={m.header_search_soon()}
					/>
				</label>

				<div className="ml-auto flex shrink-0 items-center gap-1">
					<Menu.Root>
						<Menu.Trigger
							aria-label={m.header_more_actions()}
							className={iconButton()}
						>
							<DotsThreeIcon size={18} weight="bold" />
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner
								className="z-50 outline-none"
								align="end"
								sideOffset={6}
							>
								<Menu.Popup className={menuPopup()}>
									<Menu.Item
										className={menuItem()}
										disabled
										title={m.header_share_soon()}
									>
										<ShareNetworkIcon size={14} weight="bold" />
										{m.header_share()}
										<span className={soonBadge()}>
											{m.header_coming_soon_badge()}
										</span>
									</Menu.Item>
									<Menu.Item className={menuItem()} onClick={toggleTheme}>
										{settings.dark ? (
											<SunIcon size={14} weight="bold" />
										) : (
											<MoonIcon size={14} weight="bold" />
										)}
										{settings.dark
											? m.header_theme_light()
											: m.header_theme_dark()}
									</Menu.Item>
									<Menu.Item
										className={menuItem()}
										disabled
										title={m.header_font_soon()}
									>
										<TextAaIcon size={14} weight="bold" />
										{m.header_font()}
										<span className={soonBadge()}>
											{m.header_coming_soon_badge()}
										</span>
									</Menu.Item>
									<Menu.Item
										className={menuItem()}
										disabled
										title={m.header_report_issue_soon()}
									>
										<FlagIcon size={14} weight="bold" />
										{m.header_report_issue()}
										<span className={soonBadge()}>
											{m.header_coming_soon_badge()}
										</span>
									</Menu.Item>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>

					<UserMenu />
				</div>
			</div>

			<div className={treeTabs()}>
				<span className={treeTab()}>{m.header_tree_current()}</span>
				<span
					aria-hidden="true"
					className={newTreeButton()}
					title={m.header_new_tree_soon()}
				>
					<PlusIcon size={13} weight="bold" />
				</span>
			</div>
		</>
	);
}
