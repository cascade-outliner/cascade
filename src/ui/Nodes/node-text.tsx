import type { NodeProps } from "#/ui/Nodes/node";

interface NodeTextProps extends Pick<NodeProps, "text"> {}

export function NodeText({ text }: NodeTextProps) {
	return <span>{text}</span>;
}
