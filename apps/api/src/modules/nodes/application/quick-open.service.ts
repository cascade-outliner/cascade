import { BadRequestException, Injectable } from "@nestjs/common";
import { nodePlainText, normalizeSearchText } from "../domain/node-search-text";
import { toNodeSlug } from "../domain/node-slug";
import { quickOpenSnippet } from "../domain/quick-open-snippet";
import type { QuickOpenResultDto } from "../dto/quick-open.dto";
import type { QuickOpenAncestorRow } from "../infrastructure/nodes.repository";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

const MIN_QUERY_LENGTH = 2;

/**
 * Ported from apps/web-app's quick-open.ts. Doesn't yet re-apply that
 * procedure's `assertNodeCapabilityEnabled(userId, "search")` gate — that
 * depends on `userSettings`/premium-seat data, which lives in Phase 5's
 * `modules/users` (not ported yet). Revisit once that module exists.
 */
@Injectable()
export class QuickOpenService {
	constructor(private readonly repository: NodesRepository) {}

	async search(
		rawQuery: string,
		userId: string,
	): Promise<QuickOpenResultDto[]> {
		const query = normalizeSearchText(rawQuery);
		if (query.length < MIN_QUERY_LENGTH) {
			throw new BadRequestException(
				`query must be at least ${MIN_QUERY_LENGTH} characters after normalization`,
			);
		}

		const matches = await this.repository.findQuickOpenMatches(userId, query);
		if (matches.length === 0) return [];

		const ancestors = await this.repository.findQuickOpenAncestors(
			userId,
			matches,
		);
		const ancestorsByMatch = new Map<string, QuickOpenAncestorRow[]>();
		for (const ancestor of ancestors) {
			const grouped = ancestorsByMatch.get(ancestor.match_id) ?? [];
			grouped.push(ancestor);
			ancestorsByMatch.set(ancestor.match_id, grouped);
		}

		return matches.map((match) => {
			const nearestFirst = ancestorsByMatch.get(match.id) ?? [];
			const displayAncestors: QuickOpenAncestorRow[] =
				nearestFirst.length <= 3
					? [...nearestFirst].reverse()
					: [
							nearestFirst.at(-1) as QuickOpenAncestorRow,
							nearestFirst[1] as QuickOpenAncestorRow,
							nearestFirst[0] as QuickOpenAncestorRow,
						];

			return {
				id: match.id,
				slug: toNodeSlug(match),
				snippet: quickOpenSnippet(match.content, query),
				ancestors: displayAncestors.map((ancestor) => ({
					id: ancestor.id,
					text: nodePlainText(ancestor.content),
				})),
				omittedAncestorCount: Math.max(0, nearestFirst.length - 3),
			};
		});
	}
}
