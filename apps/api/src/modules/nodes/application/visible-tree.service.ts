import { Injectable } from "@nestjs/common";
import type { VisibleTreeRowDto } from "../dto/visible-tree.dto";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

/**
 * Every node belonging to the current user, flat and unordered — the
 * client builds the tree from `parentId` and computes depth-first visible
 * order/filtering/collapse-gating itself. Ported from apps/web-app's
 * visible-tree.ts.
 */
@Injectable()
export class VisibleTreeService {
	constructor(private readonly repository: NodesRepository) {}

	async get(userId: string): Promise<{ rows: VisibleTreeRowDto[] }> {
		const result = await this.repository.findVisibleTree(userId);

		const rows: VisibleTreeRowDto[] = result.map((r) => ({
			id: r.id,
			parentId: r.parent_id,
			content: r.content,
			type: r.type,
			metadata: r.metadata,
			expanded: r.expanded,
			order: r.order,
			dueDate: r.due_date,
			dueTime: r.due_time,
			recurrence: r.recurrence,
			icon: r.icon,
			priority: r.priority,
			status:
				r.status_id && r.status_name
					? {
							id: r.status_id,
							name: r.status_name,
							color: r.status_color ?? "sky",
						}
					: null,
			tags: r.tags,
			isBoard: r.is_board,
		}));

		return { rows };
	}
}
