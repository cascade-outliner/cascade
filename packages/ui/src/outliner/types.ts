export interface OutlineNode {
	id: string;
	text: string;
	children: OutlineNode[];
	collapsed?: boolean;
}
