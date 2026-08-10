import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { DrizzleHealthIndicator } from "../../database/providers/drizzle-health.indicator";
import { Public } from "../../auth/decorators/public.decorator";

interface HealthReport {
	status: "ok";
	uptimeSeconds: number;
	timestamp: string;
}

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
