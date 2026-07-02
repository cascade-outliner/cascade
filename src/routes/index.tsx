import { createFileRoute } from "@tanstack/react-router";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { visibleTreeOptions } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTree } from "@/ui/nodes/virtual-tree/virtual-tree";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(visibleTreeOptions(null)),
	errorComponent: GenericErrorComponent,
	component: () => <VirtualTree rootId={null} />,
});
