import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { Public } from "../../common/decorators/public.decorator";
import { DrizzleHealthIndicator } from "../../database/drizzle-health.indicator";

interface HealthReport {
	status: "ok";
	uptimeSeconds: number;
	timestamp: string;
}

/**
 * Liveness probe (`GET /health`) and readiness probe (`GET /health/ready`).
 * The liveness check only reports that the process is up; the readiness
 * check pings Postgres via DrizzleHealthIndicator and returns a non-2xx
 * status when the database is unreachable.
 */
@Controller({ path: "health", version: VERSION_NEUTRAL })
@Public()
export class HealthController {
	constructor(
		private readonly healthCheckService: HealthCheckService,
		private readonly drizzleHealthIndicator: DrizzleHealthIndicator,
	) {}

	@Get()
	check(): HealthReport {
		return {
			status: "ok",
			uptimeSeconds: Math.round(process.uptime()),
			timestamp: new Date().toISOString(),
		};
	}

	@Get("ready")
	@HealthCheck()
	ready() {
		return this.healthCheckService.check([
			() => this.drizzleHealthIndicator.pingCheck("database"),
		]);
	}
}
