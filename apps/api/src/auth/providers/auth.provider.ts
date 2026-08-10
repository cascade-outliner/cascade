import type { Auth } from "@cascade/auth/server";
import type { Provider } from "@nestjs/common";
import {
	DRIZZLE,
	DrizzleClient,
} from "../../database/providers/drizzle.provider";
import { AUTH_SESSION } from "../constants/auth.constants";

export const authProvider: Provider = {
	provide: AUTH_SESSION,
	inject: [DRIZZLE],
	useFactory: async (db: DrizzleClient): Promise<Auth> => {
		const { createAuth } = await import("@cascade/auth/server");

		return createAuth(db);
	},
};
