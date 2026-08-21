import { cva } from "cva";

const hitArea = cva({
	base: "group relative inline-flex size-[18px] shrink-0 cursor-pointer select-none items-center justify-center rounded-full p-0",
});
const overlay = cva({
	base: "absolute inset-0 rounded-full bg-muted opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50",
});
const dot = cva({
	base: "absolute top-1/2 left-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted group-hover:bg-ink group-focus-visible:bg-ink",
});

export function Bullet({ className }: { className?: string }) {
	return (
		<button type="button" className={hitArea({ className })}>
			<span className={overlay()} />
			<span className={dot()} />
		</button>
	);
}
