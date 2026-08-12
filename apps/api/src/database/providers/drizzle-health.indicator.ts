import { Inject, Injectable } from "@nestjs/common";
import {
	type HealthIndicatorResult,
	HealthIndicatorService,
} from "@nestjs/terminus";
import { sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleClient } from "./drizzle.provider";

const PING_TIMEOUT_MS = 5_000;

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
