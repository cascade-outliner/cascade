import { useForm } from "@tanstack/react-form";
import { redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../auth-client";
import { getSession } from "../auth.functions";

export const signUpBeforeLoad = async () => {
	const session = await getSession();
	if (session) throw redirect({ to: "/" });
};

export function SignUpPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		onSubmit: async ({ value }) => {
			const { error } = await authClient.signUp.email(value);
			if (error) {
				setError(error.message ?? "Sign up failed");
			} else {
				await navigate({ to: "/node" });
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
				<h1 className="text-xl font-semibold">Sign up</h1>
				{error && <p className="text-sm text-red-500">{error}</p>}
				<form.Field name="name">
					{(field) => (
						<input
							placeholder="Name"
							required
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							className="border px-3 py-2 text-sm rounded"
						/>
					)}
				</form.Field>
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
					Sign up
				</button>
				<a
					href="/auth/sign-in"
					className="text-center text-sm text-dark-grey/60 hover:underline"
				>
					Already have an account? Sign in
				</a>
			</form>
		</div>
	);
}
