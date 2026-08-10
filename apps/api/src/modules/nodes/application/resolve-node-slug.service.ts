import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import {
	isUuid,
	isUuidFirstBlock,
	slugifyNodeContent,
} from "../domain/node-slug";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

/** Ported from apps/web-app's resolve-node-slug.ts, including its SLUG_AMBIGUOUS fallback. */
@Injectable()
export class ResolveNodeSlugService {
	constructor(private readonly repository: NodesRepository) {}

	async resolve(
		slugId: string,
		slugText: string | null,
		userId: string,
	): Promise<{ id: string }> {
		if (isUuid(slugId)) {
			const id = await this.repository.findIdByIdAndUser(slugId, userId);
			if (!id) throw new NotFoundException("Node not found");
			return { id };
		}

		if (isUuidFirstBlock(slugId)) {
			const candidates = await this.repository.findByIdFirstBlock(
				slugId,
				userId,
			);

			if (candidates.length === 0)
				throw new NotFoundException("Node not found");
			if (candidates.length === 1) return { id: candidates[0].id };

			const trimmedSlugText = slugText?.trim();
			if (!trimmedSlugText) {
				throw new ConflictException("Ambiguous node slug");
			}

			const matches = candidates.filter(
				(candidate) =>
					slugifyNodeContent(candidate.content) === trimmedSlugText,
			);

			if (matches.length === 1) return { id: matches[0].id };
			if (matches.length === 0) throw new NotFoundException("Node not found");
			throw new ConflictException("Ambiguous node slug");
		}

		const id = await this.repository.findIdByIdAndUser(slugId, userId);
		if (!id) throw new NotFoundException("Node not found");
		return { id };
	}
}
