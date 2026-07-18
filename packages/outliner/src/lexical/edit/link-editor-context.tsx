import { createContext, use } from "react";

export interface LinkEditorContextValue {
	/** Called when a link's edit popover opens/closes, so the row's blur
	 * handler can tell "the user clicked into the popover" apart from
	 * "the user is done editing this row" and skip exiting edit mode. */
	setLinkPopoverOpen: (open: boolean) => void;
	/** Persists the row's current content; called once a link popover closes; the
	 * row's own blur-triggered save is suppressed while a popover is open. */
	requestSave: () => void;
}

const LinkEditorContext = createContext<LinkEditorContextValue | null>(null);

export const LinkEditorContextProvider = LinkEditorContext.Provider;

export function useLinkEditorContext(): LinkEditorContextValue {
	const context = use(LinkEditorContext);
	if (!context) {
		throw new Error(
			"useLinkEditorContext must be used within a LinkEditorContextProvider",
		);
	}
	return context;
}
