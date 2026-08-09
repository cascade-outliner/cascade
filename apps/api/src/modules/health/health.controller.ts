import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";

interface HealthReport {
	status: "ok";
	uptimeSeconds: number;
	timestamp: string;
}

/**
 * Liveness probe only. Once src/database exists, add a readiness probe
 * here (via @nestjs/terminus) that pings Postgres instead of just the
 * process.
 */
@Controller({ path: "health", version: VERSION_NEUTRAL })
@Public()
export class HealthController {
	@Get()
	check(): HealthReport {
		return {
			status: "ok",
			uptimeSeconds: Math.round(process.uptime()),
			timestamp: new Date().toISOString(),
		};
	}
}
