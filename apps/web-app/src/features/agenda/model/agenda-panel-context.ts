import { createContext, useContext } from "react";

/** Lets a deeply nested `AgendaRow` close the agenda panel on navigation
 * without prop-drilling a callback through section/day-group components. */
export const AgendaPanelCloseContext = createContext<() => void>(() => {});

export const useAgendaPanelClose = () => useContext(AgendaPanelCloseContext);
