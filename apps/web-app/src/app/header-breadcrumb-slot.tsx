import { createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

interface HeaderBreadcrumbSlotContextValue {
	slot: HTMLElement | null;
	setSlot: (el: HTMLElement | null) => void;
}

const HeaderBreadcrumbSlotContext =
	createContext<HeaderBreadcrumbSlotContextValue | null>(null);

/**
 * Wraps both `AppHeader` and the routed `Outlet` so a page rendered deep in
 * the outlet (e.g. node detail) can portal content — breadcrumbs — into a
 * slot `AppHeader` owns, without either side importing the other.
 */
export function HeaderBreadcrumbSlotProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [slot, setSlot] = useState<HTMLElement | null>(null);

	return (
		<HeaderBreadcrumbSlotContext.Provider value={{ slot, setSlot }}>
			{children}
		</HeaderBreadcrumbSlotContext.Provider>
	);
}

/** Rendered inside `AppHeader` to mark the portal target for breadcrumbs. */
export function HeaderBreadcrumbSlot({ className }: { className?: string }) {
	const context = useContext(HeaderBreadcrumbSlotContext);
	return <div ref={context?.setSlot} className={className} />;
}

/** Portals its children into the slot `AppHeader` renders, if mounted. */
export function HeaderBreadcrumbPortal({ children }: { children: ReactNode }) {
	const context = useContext(HeaderBreadcrumbSlotContext);
	if (!context?.slot) return null;
	return createPortal(children, context.slot);
}
