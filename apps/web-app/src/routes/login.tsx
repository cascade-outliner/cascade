import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/login")({ component: Login });

export const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

function Login() {
	const navigate = useNavigate();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: { onChange: loginSchema },
		onSubmit: async ({ value }) => {
			setFormError(null);
			const { error } = await authClient.signIn.email(value);
			if (error) {
				setFormError(error.message ?? "Login failed");
				return;
			}
			navigate({ to: "/" });
		},
	});

	return (
		<div className="flex flex-col gap-4 p-8 max-w-sm mx-auto">
			<h1 className="text-xl font-bold">Log in</h1>
			<form
				className="flex flex-col gap-3"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{(field) => (
						<div className="flex flex-col gap-1">
							<input
								className="border rounded px-3 py-2"
								type="email"
								placeholder="Email"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-red-600 text-sm">
									{field.state.meta.errors.map((e) => e?.message).join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="password">
					{(field) => (
						<div className="flex flex-col gap-1">
							<input
								className="border rounded px-3 py-2"
								type="password"
								placeholder="Password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-red-600 text-sm">
									{field.state.meta.errors.map((e) => e?.message).join(", ")}
								</p>
							)}
						</div>
					)}
				</form.Field>
				{formError && <p className="text-red-600 text-sm">{formError}</p>}
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<button
							className="bg-ink text-canvas rounded px-3 py-2 disabled:opacity-50"
							type="submit"
							disabled={!canSubmit}
						>
							Log in
						</button>
					)}
				</form.Subscribe>
			</form>
			<p className="text-sm">
				No account? <Link to="/register">Register</Link>
			</p>
		</div>
	);
}
