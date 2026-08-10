import { Injectable } from "@nestjs/common";
import type { NodeDto } from "../dto/node.dto";
import { NodesRepository } from "../repository/nodes.repository";

@Injectable()
export class VisibleTreeService {
	constructor(private readonly repository: NodesRepository) {}

	async get(userId: string): Promise<{ rows: NodeDto[] }> {
		const result = await this.repository.findVisibleTree(userId);

		const rows: NodeDto[] = result.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			content: r.content,
		}));

		return { rows };
	}
}
