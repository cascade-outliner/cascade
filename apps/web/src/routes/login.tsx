import { authClient } from "@cascade/auth/client";
import { Button } from "@cascade/ui/button";
import { Input } from "@cascade/ui/input";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Footer } from "#/components/marketing/footer";
import { Nav } from "#/components/marketing/nav";
import { appUrl } from "#/lib/app-url";
import { seoHead } from "#/lib/seo";

export const Route = createFileRoute("/login")({
	head: () =>
		seoHead(
			"Log in - Cascade",
			"Log in to Cascade, the infinitely nested outliner.",
			"/login",
		),
	component: Login,
});

function Login() {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setError(null);
		setSubmitting(true);

		const { error: signInError } = await authClient.signIn.email({
			email: String(form.get("email")),
			password: String(form.get("password")),
		});

		if (signInError) {
			setSubmitting(false);
			setError(signInError.message ?? "Something went wrong. Try again.");
			return;
		}
		window.location.href = appUrl;
	}

	return (
		<>
			<Nav />
			<main className="mx-auto max-w-sm px-8 pt-16 pb-24 min-h-128">
				<h1 className="mb-8 text-center font-serif text-4xl italic">Log in</h1>
				<form
					method="post"
					onSubmit={handleSubmit}
					className="flex flex-col gap-4"
				>
					<Input
						label="Email"
						name="email"
						type="email"
						autoComplete="email"
						required
					/>
					<Input
						label="Password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
					{error && (
						<p role="alert" className="text-sm text-redleather">
							{error}
						</p>
					)}
					<Button
						type="submit"
						disabled={submitting}
						className="mt-2 self-center"
						icon={<ArrowRightIcon className="size-4" weight="bold" />}
					>
						Log in
					</Button>
				</form>
				<p className="mt-8 text-center text-sm text-graphite">
					No account yet?
					<Link to="/register" className="font-bold text-redleather">
						Create one
					</Link>
				</p>
			</main>
			<Footer />
		</>
	);
}
