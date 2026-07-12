import { useRouter } from "@tanstack/react-router";
import { m } from "#/paraglide/messages.js";

export function GenericErrorComponent({ error }: { error: Error }) {
	const router = useRouter();

	return (
		<div className="max-w-xl mx-auto py-32 text-center flex flex-col items-center gap-4">
			<h1 className="text-2xl font-semibold">{m.error_generic_heading()}</h1>
			<p className="text-sm opacity-70">{m.error_generic_body()}</p>
			<button
				type="button"
				className="px-4 py-2 rounded border border-current text-sm"
				onClick={() => router.invalidate()}
			>
				{m.error_generic_retry()}
			</button>
			{import.meta.env.DEV && (
				<pre className="mt-8 text-left text-xs overflow-x-auto max-w-full p-4 bg-black/5 rounded">
					{error.stack}
				</pre>
			)}
		</div>
	);
}
