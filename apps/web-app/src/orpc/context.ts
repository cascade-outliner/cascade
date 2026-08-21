import { auth } from "@cascade/auth";

export async function createContext({ request }: { request: Request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	return { session };
}

export type ORPCContext = Awaited<ReturnType<typeof createContext>>;
