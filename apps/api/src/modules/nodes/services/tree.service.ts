import { Inject, Injectable } from "@nestjs/common";
import type { NodeDTO } from "../dto/nodeDTO";
import { NodesRepository } from "../repository/nodes.repository";

@Injectable()
export class VisibleTreeService {
	constructor(
		@Inject(NodesRepository)
		private readonly repository: NodesRepository,
	) {}

	async get(userId: string): Promise<{ rows: NodeDTO[] }> {
		const result = await this.repository.findVisibleTree(userId);

		const rows: NodeDTO[] = result.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			content: r.content,
		}));

		return { rows };
	}
}
