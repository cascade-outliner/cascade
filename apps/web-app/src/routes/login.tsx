import { authClient } from "@cascade/auth/client";
import { Button } from "@cascade/ui/button";
import { Input } from "@cascade/ui/input";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { m } from "#/paraglide/messages.js";
import { oauthErrorMessage } from "@/features/auth/model/oauth-error-message";
import { getSession } from "@/features/auth/server/get-session";
import { AuthPageLayout } from "@/features/auth/ui/auth-page-layout";
import { AuthSubmitError } from "@/features/auth/ui/auth-submit-error";
import { SocialSignInButtons } from "@/features/auth/ui/social-sign-in-buttons";

export const Route = createFileRoute("/login")({
	validateSearch: z.object({ error: z.string().optional() }),
	beforeLoad: async () => {
		const session = await getSession();
		if (session) throw redirect({ to: "/" });
	},
	component: Login,
});

function Login() {
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

		const { error: signInError } = await authClient.signIn.email({
			email: String(form.get("email")),
			password: String(form.get("password")),
		});
		if (signInError) {
			setSubmitting(false);
			setError(signInError.message ?? m.login_error_fallback());
			return;
		}
		window.location.href = "/";
	}

	return (
		<AuthPageLayout
			heading={m.login_heading()}
			footer={
				<>
					{m.login_no_account()}
					<Link to="/register" className="pl-1 font-bold text-danger">
						{m.login_create_one()}
					</Link>
				</>
			}
		>
			<SocialSignInButtons errorPath={Route.fullPath} />
			<form
				method="post"
				onSubmit={handleSubmit}
				className="rr-block flex flex-col gap-4"
			>
				<Input
					label={m.login_email_label()}
					name="email"
					type="email"
					autoComplete="email"
					required
				/>
				<Input
					label={m.login_password_label()}
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
				<AuthSubmitError message={error} />
				<Button
					type="submit"
					disabled={submitting}
					className="mt-2 self-center"
					icon={<ArrowRightIcon className="size-4" weight="bold" />}
				>
					{m.login_submit()}
				</Button>
			</form>
		</AuthPageLayout>
	);
}
