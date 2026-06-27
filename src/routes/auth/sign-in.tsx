import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/integrations/better-auth/auth-client";

export const Route = createFileRoute("/auth/sign-in")({
	component: SignIn,
});

function SignIn() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: { email: "", password: "" },
		onSubmit: async ({ value }) => {
			const { error } = await authClient.signIn.email(value);
			if (error) {
				setError(error.message ?? "Sign in failed");
			} else {
				await navigate({ to: "/" });
			}
		},
	});

	return (
		<div className="flex min-h-screen items-center justify-center">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4 w-80"
			>
				<h1 className="text-xl font-semibold">Sign in</h1>
				{error && <p className="text-sm text-red-500">{error}</p>}
				<form.Field name="email">
					{(field) => (
						<input
							type="email"
							placeholder="Email"
							required
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							className="border px-3 py-2 text-sm rounded"
						/>
					)}
				</form.Field>
				<form.Field name="password">
					{(field) => (
						<input
							type="password"
							placeholder="Password"
							required
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							className="border px-3 py-2 text-sm rounded"
						/>
					)}
				</form.Field>
				<button
					type="submit"
					className="py-2 text-sm bg-dark-grey text-white rounded"
				>
					Sign in
				</button>
				<a
					href="/auth/sign-up"
					className="text-center text-sm text-dark-grey/60 hover:underline"
				>
					No account? Sign up
				</a>
			</form>
		</div>
	);
}
