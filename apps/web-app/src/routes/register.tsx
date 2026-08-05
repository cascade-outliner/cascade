import { authClient } from "@cascade/auth/client";
import { Button } from "@cascade/ui/button";
import { Input } from "@cascade/ui/input";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { m } from "#/paraglide/messages.js";
import { authErrorMessage } from "@/features/auth/model/auth-error-message";
import {
	validateEmail,
	validateName,
	validateNewPassword,
} from "@/features/auth/model/field-validators";
import { oauthErrorMessage } from "@/features/auth/model/oauth-error-message";
import { getSession } from "@/features/auth/server/get-session";
import { getEnabledSocialProviders } from "@/features/auth/server/social-providers";
import { AuthPageLayout } from "@/features/auth/ui/auth-page-layout";
import { AuthSubmitError } from "@/features/auth/ui/auth-submit-error";
import { FieldError } from "@/features/auth/ui/field-error";
import { PasswordInput } from "@/features/auth/ui/password-input";
import { PasswordStrengthMeter } from "@/features/auth/ui/password-strength-meter";
import { SocialSignInButtons } from "@/features/auth/ui/social-sign-in-buttons";

export const Route = createFileRoute("/register")({
	validateSearch: z.object({ error: z.string().optional() }),
	beforeLoad: async () => {
		const session = await getSession();
		if (session) throw redirect({ to: "/" });
	},
	loader: () => getEnabledSocialProviders(),
	component: Register,
});

function Register() {
	const { error: oauthError } = Route.useSearch();
	const socialProviders = Route.useLoaderData();
	const [submitError, setSubmitError] = useState<string | null>(
		oauthErrorMessage(oauthError),
	);

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			const { error } = await authClient.signUp.email({
				name: value.name,
				email: value.email,
				password: value.password,
			});
			if (error) {
				setSubmitError(authErrorMessage(error));
				return;
			}
			window.location.href = "/";
		},
	});

	return (
		<AuthPageLayout
			heading={m.register_heading()}
			subheading={m.register_subheading()}
			footer={
				<>
					{m.register_have_account()}
					<Link to="/login" className="pl-1 font-bold text-danger">
						{m.register_login_link()}
					</Link>
				</>
			}
		>
			<SocialSignInButtons
				errorPath={Route.fullPath}
				googleEnabled={socialProviders.google}
			/>
			<form
				method="post"
				onSubmit={(event) => {
					event.preventDefault();
					form.handleSubmit();
				}}
				className="rr-block flex flex-col gap-4"
				noValidate
			>
				<form.Field
					name="name"
					validators={{
						onChange: ({ value }) => validateName(value),
						onBlur: ({ value }) => validateName(value),
					}}
				>
					{(field) => (
						<Input
							label={m.register_name_label()}
							name={field.name}
							type="text"
							autoComplete="name"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={
								field.state.meta.isTouched && field.state.meta.errors.length > 0
							}
							hint={
								field.state.meta.isTouched ? (
									<FieldError message={field.state.meta.errors[0]} />
								) : undefined
							}
						/>
					)}
				</form.Field>
				<form.Field
					name="email"
					validators={{
						onChange: ({ value }) => validateEmail(value),
						onBlur: ({ value }) => validateEmail(value),
					}}
				>
					{(field) => (
						<Input
							label={m.register_email_label()}
							name={field.name}
							type="email"
							autoComplete="email"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
							onBlur={field.handleBlur}
							aria-invalid={
								field.state.meta.isTouched && field.state.meta.errors.length > 0
							}
							hint={
								field.state.meta.isTouched ? (
									<FieldError message={field.state.meta.errors[0]} />
								) : undefined
							}
						/>
					)}
				</form.Field>
				<form.Field
					name="password"
					validators={{
						onChange: ({ value }) => validateNewPassword(value),
						onBlur: ({ value }) => validateNewPassword(value),
					}}
				>
					{(field) => {
						const showError =
							field.state.meta.isTouched && field.state.meta.errors[0];
						return (
							<div className="flex flex-col gap-2">
								<PasswordInput
									label={m.register_password_label()}
									name={field.name}
									autoComplete="new-password"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									aria-invalid={Boolean(showError)}
									hint={
										showError ? (
											<FieldError message={field.state.meta.errors[0]} />
										) : (
											<p className="text-xs text-muted">
												{m.register_password_requirements()}
											</p>
										)
									}
								/>
								<PasswordStrengthMeter password={field.state.value} />
							</div>
						);
					}}
				</form.Field>
				<AuthSubmitError message={submitError} />
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							disabled={isSubmitting}
							className="mt-2 self-center"
							icon={<ArrowRightIcon className="size-4" weight="bold" />}
						>
							{m.register_submit()}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</AuthPageLayout>
	);
}
