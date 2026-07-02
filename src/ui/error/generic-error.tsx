import { useRouter } from "@tanstack/react-router";

export function GenericErrorComponent({ error }: { error: Error }) {
	const router = useRouter();

	return (
		<div className="max-w-xl mx-auto py-32 text-center flex flex-col items-center gap-4">
			<h1 className="text-2xl font-semibold">Something went wrong</h1>
			<p className="text-sm opacity-70">
				An unexpected error occurred. Try again, and if it keeps happening,
				reload the page.
			</p>
			<button
				type="button"
				className="px-4 py-2 rounded border border-current text-sm"
				onClick={() => router.invalidate()}
			>
				Try again
			</button>
			{import.meta.env.DEV && (
				<pre className="mt-8 text-left text-xs overflow-x-auto max-w-full p-4 bg-black/5 rounded">
					{error.stack}
				</pre>
			)}
		</div>
	);
}
