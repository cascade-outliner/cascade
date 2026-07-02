import { os } from "@orpc/server";

export interface ORPCContext {
	request: Request;
	// auth session slots in here later
}

export function createContext(request: Request): ORPCContext {
	return { request };
}

export const base = os.$context<ORPCContext>();
