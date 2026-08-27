import { enableStaticRendering } from "mobx-react-lite";

/**
 * The dashboard is server-rendered by TanStack Start. Without this, `observer`
 * components subscribe to observables during SSR and never unsubscribe, because
 * there is no unmount on the server.
 */
enableStaticRendering(typeof window === "undefined");
