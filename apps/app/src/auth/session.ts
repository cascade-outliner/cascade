import { auth } from "@cascade/auth/server";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getSession = createServerFn({ method: "GET" }).handler(() =>
	auth.api.getSession({ headers: getRequest().headers }),
);
