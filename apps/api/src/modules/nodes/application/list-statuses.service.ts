import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: StatusesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { StatusesRepository } from "../infrastructure/statuses.repository";

@Injectable()
export class ListStatusesService {
	constructor(private readonly repository: StatusesRepository) {}

	async list(userId: string, boardId: string) {
		return this.repository.listWithUsage(userId, boardId);
	}
}
