import { Menu } from "@base-ui/react/menu";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { TextIndentIcon } from "@phosphor-icons/react/dist/ssr/TextIndent";
import { TextOutdentIcon } from "@phosphor-icons/react/dist/ssr/TextOutdent";
import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr/TrashSimple";
import { cva } from "cva";
import { useItem } from "../context";

const trigger = cva({
	base: "absolute right-full top-1/2 -translate-y-1/2 inline-flex size-[18px] shrink-0 cursor-pointer select-none items-center justify-center rounded-full p-0 text-muted opacity-0 hover:bg-ink/20 hover:text-ink focus-visible:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100 data-[popup-open]:bg-ink/20 data-[popup-open]:text-ink",
});
const popup = cva({
	base: "min-w-36 origin-[var(--transform-origin)] rounded-lg border border-ink/10 bg-white p-1 shadow-lg outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
});
const item = cva({
	base: "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-ink/10",
});
const deleteItem = cva({
	base: "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger outline-none data-[highlighted]:bg-danger/10",
});

export function Actions({
	className,
	previousSiblingId,
	parentId,
	grandParentId,
	onDelete,
	onIndent,
	onOutdent,
}: {
	className?: string;
	previousSiblingId?: string;
	parentId?: string;
	grandParentId?: string;
	onDelete?: (id: string) => void;
	onIndent?: (id: string, previousSiblingId: string) => void;
	onOutdent?: (id: string, newParentId: string | null) => void;
}) {
	const { node } = useItem();

	return (
		<Menu.Root>
			<Menu.Trigger className={trigger({ className })}>
				<DotsThreeIcon size={14} weight="bold" />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner sideOffset={8} align="end">
					<Menu.Popup className={popup()}>
						{onIndent && (
							<Menu.Item
								className={item()}
								disabled={!previousSiblingId}
								onClick={() =>
									previousSiblingId && onIndent(node.id, previousSiblingId)
								}
							>
								<TextIndentIcon size={14} weight="bold" />
								Indent
							</Menu.Item>
						)}
						{onOutdent && (
							<Menu.Item
								className={item()}
								disabled={!parentId}
								onClick={() =>
									parentId && onOutdent(node.id, grandParentId ?? null)
								}
							>
								<TextOutdentIcon size={14} weight="bold" />
								Outdent
							</Menu.Item>
						)}
						<Menu.Item
							className={deleteItem()}
							onClick={() => onDelete?.(node.id)}
						>
							<TrashSimpleIcon size={14} weight="bold" />
							Delete
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
