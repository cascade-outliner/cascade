import { authClient } from "@cascade/auth/client";
import { GoogleLogoIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";

interface SocialSignInButtonsProps {
	errorPath: string;
	googleEnabled: boolean;
}

function signInWithGoogle(errorPath: string) {
	return authClient.signIn.social({
		provider: "google",
		callbackURL: `${window.location.origin}/`,
		errorCallbackURL: window.location.origin + errorPath,
	});
}

export function SocialSignInButtons({
	errorPath,
	googleEnabled,
}: SocialSignInButtonsProps) {
	if (!googleEnabled) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => signInWithGoogle(errorPath)}
				className="mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-ink/15 py-3 text-sm font-bold transition-colors duration-small-enter hover:bg-ink/5 dark:border-surface/20 dark:hover:bg-surface/10"
			>
				<GoogleLogoIcon className="size-4" weight="bold" />
				{m.login_continue_google()}
			</button>
			<div className="mb-6 flex items-center gap-3 text-xs text-muted">
				<hr className="grow border-ink/10 dark:border-surface/15" />
				{m.login_or()}
				<hr className="grow border-ink/10 dark:border-surface/15" />
			</div>
		</>
	);
}
