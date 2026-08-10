import { Inject, Injectable } from "@nestjs/common";
import {
	type HealthIndicatorResult,
	HealthIndicatorService,
} from "@nestjs/terminus";
import { sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleClient } from "./drizzle.provider";

const PING_TIMEOUT_MS = 5_000;

/**
 * Terminus doesn't ship a first-party indicator for raw Drizzle/postgres
 * clients (only a TypeORM one), so this runs a trivial query through the
 * DRIZZLE token with a timeout, so a hung DB can't hang the readiness probe.
 */
@Injectable()
export class DrizzleHealthIndicator {
	constructor(
		@Inject(DRIZZLE) private readonly db: DrizzleClient,
		private readonly healthIndicatorService: HealthIndicatorService,
	) {}

	async pingCheck(key: string): Promise<HealthIndicatorResult> {
		const indicator = this.healthIndicatorService.check(key);

		try {
			await Promise.race([
				this.db.execute(sql`SELECT 1`),
				new Promise((_, reject) => {
					setTimeout(
						() => reject(new Error("Database ping timed out")),
						PING_TIMEOUT_MS,
					);
				}),
			]);
		} catch (error) {
			return indicator.down({
				message:
					error instanceof Error ? error.message : "Database ping failed",
			});
		}

		return indicator.up();
	}
}
