import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

@Injectable()
export class ListNodesService {
	constructor(private readonly repository: NodesRepository) {}

	async list(parentId: string | null, userId: string) {
		return this.repository.findByParent(parentId, userId);
	}
}
