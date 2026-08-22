import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { cva } from "cva";
import { useItem } from "../context";

const toggle = cva({
	base: "group inline-flex size-[18px] shrink-0 cursor-pointer select-none items-center justify-center p-0",
});
const icon = cva({
	base: "text-muted transition-transform group-hover:text-ink group-focus-visible:text-ink",
	variants: { collapsed: { false: "rotate-90" } },
});
const spacer = cva({ base: "inline-block size-[18px] shrink-0" });

export function Toggle({
	className,
	onToggle,
}: {
	className?: string;
	onToggle?: (id: string, collapsed: boolean) => void;
}) {
	const { node } = useItem();

	if (node.children.length === 0) {
		return <span className={spacer({ className })} />;
	}

	return (
		<button
			type="button"
			className={toggle({ className })}
			onClick={() => onToggle?.(node.id, !node.collapsed)}
		>
			<CaretRight
				className={icon({ collapsed: node.collapsed })}
				size={12}
				weight="bold"
			/>
		</button>
	);
}
