import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { SmileyIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { IconFeatureContext } from "../icon-feature";
import { EmojiPicker } from "./emoji-picker";

export function IconMenuItem({ ctx }: { ctx: IconFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={
					ctx.icon ? (
						<span aria-hidden className="text-sm leading-none">
							{ctx.icon}
						</span>
					) : (
						<SmileyIcon size={14} weight="bold" />
					)
				}
				openOnHover
				delay={150}
			>
				{ctx.icon ? labels.changeIcon : labels.setIcon}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<EmojiPicker
					value={ctx.icon}
					onSelect={ctx.onSetIcon}
					onClear={() => ctx.onSetIcon(null)}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
