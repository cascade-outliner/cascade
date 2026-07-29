import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { ORPCError } from "@orpc/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";
import { useSharedTree } from "@/features/sharing/client/use-shared-tree";
import { SharedTreeView } from "@/features/sharing/ui/shared-tree-view";

export const Route = createFileRoute("/shared/$token")({
	component: SharedTreePage,
});

function SharedTreePage() {
	const { token } = Route.useParams();
	const query = useSharedTree(token);

	if (query.status === "pending") return <CascadeLoader />;

	if (query.status === "error") {
		const code =
			query.error instanceof ORPCError ? query.error.code : undefined;
		if (code === "GONE") {
			return (
				<SharedTreeNotice
					title={m.sharing_revoked_title()}
					body={m.sharing_revoked_body()}
				/>
			);
		}
		if (code === "UNAUTHORIZED") {
			return (
				<SharedTreeNotice
					title={m.sharing_sign_in_required_title()}
					body={m.sharing_sign_in_required_body()}
					action={
						<Link to="/login" className="font-bold text-danger">
							{m.sharing_sign_in_cta()}
						</Link>
					}
				/>
			);
		}
		return (
			<SharedTreeNotice
				title={m.sharing_not_found_title()}
				body={m.sharing_not_found_body()}
			/>
		);
	}

	const pages = query.data.pages;
	const firstPage = pages[0];
	const rows = pages.flatMap((page) => page.rows);
	if (!firstPage) return null;

	return (
		<div className="isolate h-dvh overflow-auto">
			<div className="mx-auto max-w-6xl px-4 py-16">
				<div className="mb-8 flex flex-wrap items-center gap-2 text-ink/60 text-sm dark:text-surface/60">
					<span>{m.sharing_shared_by({ name: firstPage.ownerName })}</span>
					<span className="rounded-full bg-ink/5 px-2 py-0.5 dark:bg-surface/10">
						{m.sharing_read_only_badge()}
					</span>
				</div>
				<SharedTreeView rootId={firstPage.rootId} rows={rows} />
				{query.hasNextPage && (
					<button
						type="button"
						className="mt-4 cursor-pointer text-danger text-sm hover:underline"
						disabled={query.isFetchingNextPage}
						onClick={() => query.fetchNextPage()}
					>
						{m.sharing_load_more()}
					</button>
				)}
			</div>
		</div>
	);
}

function SharedTreeNotice({
	title,
	body,
	action,
}: {
	title: string;
	body: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-32 text-center">
			<h1 className="font-semibold text-2xl">{title}</h1>
			<p className="text-ink/60 text-sm dark:text-surface/60">{body}</p>
			{action}
		</div>
	);
}
