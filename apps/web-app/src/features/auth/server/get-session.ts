import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/features/auth/server/auth";

export const getSession = createServerFn({ method: "GET" }).handler(() =>
	auth.api.getSession({ headers: getRequest().headers }),
);
