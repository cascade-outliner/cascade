import { cva } from "cva";
import { useItem } from "../context";

const toggle = cva({ base: "inline-block w-4 select-none text-muted" });
const spacer = cva({ base: "inline-block w-4" });

export function Toggle({ className }: { className?: string }) {
	const { node } = useItem();

	if (node.children.length === 0) {
		return <span className={spacer({ className })} />;
	}

	return (
		<span className={toggle({ className })}>{node.collapsed ? "▸" : "▾"}</span>
	);
}
