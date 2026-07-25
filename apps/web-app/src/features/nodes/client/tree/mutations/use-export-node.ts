import { downloadTextFile } from "@cascade/outliner/download-text-file";
import type { ExportFormat } from "@cascade/outliner/node-types";
import { toast } from "@cascade/ui/toast";
import { useMutation } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";

const EXTENSIONS: Record<ExportFormat, string> = {
	markdown: "md",
	opml: "opml",
};

const MIME_TYPES: Record<ExportFormat, string> = {
	markdown: "text/markdown",
	opml: "text/x-opml",
};

export function useExportMutation() {
	const mutation = useMutation({
		mutationFn: (vars: { rootId: string | null; format: ExportFormat }) =>
			client.nodes.export(vars),
	});

	return (rootId: string | null, format: ExportFormat) => {
		const run = async () => {
			const { content } = await mutation.mutateAsync({ rootId, format });
			downloadTextFile(
				`cascade-export.${EXTENSIONS[format]}`,
				content,
				MIME_TYPES[format],
			);
		};

		return toast
			.promise(run(), {
				loading: m.node_exporting(),
				success: m.node_exported(),
				error: m.node_export_failed(),
			})
			.catch(() => {
				// Already surfaced by the error toast above.
			});
	};
}
