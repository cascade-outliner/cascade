import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteNavigation } from "./site-navigation";

export function PublicPageLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<SiteNavigation />
			{children}
			<SiteFooter />
		</>
	);
}
