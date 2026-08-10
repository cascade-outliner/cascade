import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: TreeHistoryPurgeRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { TreeHistoryPurgeRepository } from "../infrastructure/tree-history-purge.repository";

export interface PurgeTreeHistoryResult {
	days: number;
	dryRun: boolean;
	purgedIds: string[];
}

const MS_PER_DAY = 86_400_000;

/**
 * TREE_HISTORY_RETENTION_DAYS is the default cutoff for this purge job
 * *and* (in a later phase) the read/restore visibility window — see
 * CLAUDE.md's "Data layer" section. Read it here rather than hardcoding 30.
 */
function defaultRetentionDays(): number {
	const raw = process.env.TREE_HISTORY_RETENTION_DAYS;
	if (raw === undefined) {
		return 30;
	}
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(
			"TREE_HISTORY_RETENTION_DAYS must be a non-negative integer",
		);
	}
	return parsed;
}

@Injectable()
export class PurgeTreeHistoryService {
	constructor(private readonly repository: TreeHistoryPurgeRepository) {}

	async purge(days?: number, dryRun = false): Promise<PurgeTreeHistoryResult> {
		const resolvedDays = days ?? defaultRetentionDays();
		if (!Number.isInteger(resolvedDays) || resolvedDays < 0) {
			throw new Error("days must be a non-negative integer");
		}

		const before = new Date(Date.now() - resolvedDays * MS_PER_DAY);
		const purgedIds = dryRun
			? await this.repository.findEventIdsOlderThan(before)
			: await this.repository.deleteEventsOlderThan(before);

		return { days: resolvedDays, dryRun, purgedIds };
	}
}
