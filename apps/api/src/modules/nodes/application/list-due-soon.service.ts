import { Injectable } from "@nestjs/common";
import { lexicalToPlainText } from "../domain/lexical-content";
import { toNodeSlug } from "../domain/node-slug";
import type { DueSoonTaskDto } from "../dto/due-soon.dto";
// biome-ignore lint/style/useImportType: NodesRepository is constructor-injected; emitDecoratorMetadata needs the real runtime binding, not an erased type-only import.
import { NodesRepository } from "../infrastructure/nodes.repository";

// Ported from apps/web-app/src/features/nodes/model/due-date.schema.ts.
const DEFAULT_DUE_NOTIFICATION_TIME = "09:00";

/**
 * Nodes due in roughly the next day, for the client's real-time due-date
 * notification scheduler. Ported from apps/web-app's list-due-soon.ts —
 * see that file's doc comment for why the date window is padded a day on
 * each side of the server's own "today".
 */
@Injectable()
export class ListDueSoonService {
	constructor(private readonly repository: NodesRepository) {}

	async list(userId: string): Promise<{ tasks: DueSoonTaskDto[] }> {
		const rows = await this.repository.findDueSoon(userId);

		const tasks: DueSoonTaskDto[] = rows
			.filter(
				(row) => !(row.metadata as { completed?: boolean } | null)?.completed,
			)
			.map((row) => ({
				id: row.id,
				slug: toNodeSlug({ id: row.id, content: row.content }),
				label: lexicalToPlainText(row.content, 120),
				// Guaranteed non-null by findDueSoon's isNotNull(dueDate) filter.
				dueDate: row.dueDate as string,
				dueTime: row.dueTime ?? DEFAULT_DUE_NOTIFICATION_TIME,
				recurrence: row.recurrence,
			}));

		return { tasks };
	}
}
