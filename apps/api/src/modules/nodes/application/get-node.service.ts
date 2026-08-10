import { Injectable, NotFoundException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

@Injectable()
export class GetNodeService {
	constructor(private readonly repository: NodesRepository) {}

	async get(id: string, userId: string) {
		const node = await this.repository.findById(id, userId);
		if (!node) {
			throw new NotFoundException("Node not found");
		}
		return node;
	}
}
