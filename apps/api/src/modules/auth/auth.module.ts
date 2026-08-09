import { Module } from "@nestjs/common";
import { authProvider } from "./auth.provider";
import { SessionGuard } from "./guards/session.guard";

/**
 * Exports SessionGuard for other modules/app.module.ts to wire up (e.g. as
 * an APP_GUARD provider) — deliberately not applied app-wide here, see
 * issue #684.
 */
@Module({
	providers: [authProvider, SessionGuard],
	exports: [authProvider, SessionGuard],
})
export class AuthModule {}
