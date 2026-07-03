import type { ReactNode } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuTrigger,
} from "@/ui/context-menu";

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
