import { cva } from "cva";
import { useItem } from "../context";

const content = cva({ base: "flex-1" });

export function Content({ className }: { className?: string }) {
	const { node } = useItem();
	return <span className={content({ className })}>{node.text}</span>;
}
