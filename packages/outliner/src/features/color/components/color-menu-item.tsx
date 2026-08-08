import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { CircleIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { ColorFeatureContext } from "../color-feature";
import { ColorPicker } from "./color-picker";

export function ColorMenuItem({ ctx }: { ctx: ColorFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<CircleIcon size={14} weight="fill" />}
				openOnHover
				delay={150}
			>
				{ctx.color ? labels.changeColor : labels.setColor}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<ColorPicker
					color={ctx.color ?? null}
					onChange={ctx.onSetColor}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
