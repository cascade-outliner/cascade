import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: TagsRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { TagsRepository } from "../infrastructure/tags.repository";

@Injectable()
export class ListTagsService {
	constructor(private readonly repository: TagsRepository) {}

	async list(userId: string) {
		return this.repository.listWithUsage(userId);
	}
}
