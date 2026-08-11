import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { SerializedEditorState } from "lexical";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/providers/drizzle.provider";

export interface VisibleTreeSqlRow {
	id: string;
	parent_id: string | null;
	content: SerializedEditorState | null;
	metadata: { expanded: boolean } | null;
}

@Injectable()
export class NodesRepository {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

	async findVisibleTree(userId: string): Promise<VisibleTreeSqlRow[]> {
		return (await this.db.execute(sql`
			SELECT n.id, n.parent_id, n.content, n.metadata
			FROM nodes n
			WHERE n.user_id = ${userId}
		`)) as unknown as VisibleTreeSqlRow[];
	}
}
