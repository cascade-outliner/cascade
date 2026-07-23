import { cva } from "@cascade/ui/cva.config";

export const bar = cva({
	base: "flex shrink-0 items-center gap-3 px-4 py-2 absolute top-0 w-full z-10 before:content-[''] before:absolute before:inset-0 before:-z-10 before:backdrop-blur-md before:bg-gradient-to-b before:from-canvas before:to-transparent dark:before:from-ink before:mask-[linear-gradient(to_bottom,black_33%,transparent)] min-[1152px]:before:content-none",
});

export const brand = cva({
	base: "flex shrink-0 items-center gap-2 rounded-md font-serif text-xl italic outline-none focus-visible:ring-2 focus-visible:ring-danger/50",
});
