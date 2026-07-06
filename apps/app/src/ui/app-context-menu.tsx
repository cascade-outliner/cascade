import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuTrigger,
} from "@cascade/ui/context-menu";
import type { ReactNode } from "react";

export function AppContextMenu({ children }: { children: ReactNode }) {
	return (
		<ContextMenu>
			<ContextMenuTrigger className="block min-h-dvh">
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent></ContextMenuContent>
		</ContextMenu>
	);
}
