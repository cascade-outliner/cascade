import { Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { QuickOpen } from "@/features/quick-open/ui/quick-open";
import { useNodeCapabilities } from "@/features/settings/client/settings-context";
import { UserMenu } from "@/features/user-menu/ui/user-menu";
import { bar, brand } from "./app-header.styles";
import { HeaderBreadcrumbSlot } from "./header-breadcrumb-slot";

export function AppHeader() {
	const capabilities = useNodeCapabilities();
	return (
		<div className={bar()}>
			<Link viewTransition to="/" className={brand()}>
				<img
					width={28}
					height={28}
					alt={m.header_logo_alt()}
					src="/logo192.png"
				/>
			</Link>

			<HeaderBreadcrumbSlot className="min-w-0 flex-1" />

			<div className="ml-auto flex shrink-0 items-center gap-2">
				{capabilities.has("search") && <QuickOpen />}
				<UserMenu />
			</div>
		</div>
	);
}
