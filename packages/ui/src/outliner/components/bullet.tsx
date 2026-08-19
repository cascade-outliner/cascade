import { cva } from "cva";

const bullet = cva({ base: "select-none text-muted" });

export function Bullet({ className }: { className?: string }) {
	return <span className={bullet({ className })}>•</span>;
}
