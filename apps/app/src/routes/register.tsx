import { authClient } from "@cascade/auth/client";
import { Button } from "@cascade/ui/button";
import { Input } from "@cascade/ui/input";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { m } from "#/paraglide/messages.js";
import { oauthErrorMessage } from "@/lib/oauth-error";

export const Route = createFileRoute("/register")({
	validateSearch: z.object({ error: z.string().optional() }),
	component: Register,
});

function Register() {
	const { error: oauthError } = Route.useSearch();
	const [error, setError] = useState<string | null>(
		oauthErrorMessage(oauthError),
	);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setError(null);
		setSubmitting(true);

		const { error: signUpError } = await authClient.signUp.email({
			name: String(form.get("name")),
			email: String(form.get("email")),
			password: String(form.get("password")),
		});

		if (signUpError) {
			setSubmitting(false);
			setError(signUpError.message ?? m.register_error_fallback());
			return;
		}
		window.location.href = "/";
	}

	async function handleGithub() {
		await authClient.signIn.social({
			provider: "github",
			callbackURL: `${window.location.origin}/`,
			errorCallbackURL: window.location.origin + Route.fullPath,
		});
	}

	async function handleGoogle() {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: `${window.location.origin}/`,
			errorCallbackURL: window.location.origin + Route.fullPath,
		});
	}

	return (
		<main className="mx-auto max-w-sm px-8 pt-16 pb-24 min-h-128">
			<h1 className="mb-8 text-center font-serif text-4xl italic">
				{m.register_heading()}
			</h1>
			<button
				type="button"
				onClick={handleGithub}
				className="cursor-pointer mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-bold text-white"
			>
				<GithubLogoIcon className="size-4" weight="bold" />
				{m.login_continue_github()}
			</button>
			<button
				type="button"
				onClick={handleGoogle}
				className="cursor-pointer mb-6 flex w-full items-center justify-center gap-2 rounded-full border border-muted/30 py-3 text-sm font-bold"
			>
				<GoogleLogoIcon className="size-4" weight="bold" />
				{m.login_continue_google()}
			</button>
			<div className="mb-6 flex items-center gap-3 text-xs text-muted">
				<hr className="grow border-muted/30" />
				{m.login_or()}
				<hr className="grow border-muted/30" />
			</div>
			<form
				method="post"
				onSubmit={handleSubmit}
				className="flex flex-col gap-4 rr-block"
			>
				<Input
					label={m.register_name_label()}
					name="name"
					type="text"
					autoComplete="name"
					required
				/>
				<Input
					label={m.register_email_label()}
					name="email"
					type="email"
					autoComplete="email"
					required
				/>
				<Input
					label={m.register_password_label()}
					name="password"
					type="password"
					autoComplete="new-password"
					minLength={8}
					required
				/>
				{error && (
					<p role="alert" className="text-sm text-danger">
						{error}
					</p>
				)}
				<Button
					type="submit"
					disabled={submitting}
					className="mt-2 self-center"
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					{m.register_submit()}
				</Button>
			</form>
			<p className="mt-8 text-center text-sm text-muted">
				{m.register_have_account()}
				<Link to="/login" className="font-bold text-danger pl-1">
					{m.register_login_link()}
				</Link>
			</p>
		</main>
	);
}
