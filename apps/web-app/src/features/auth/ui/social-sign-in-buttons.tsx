import { authClient } from "@cascade/auth/client";
import { GoogleLogoIcon } from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";

interface SocialSignInButtonsProps {
	errorPath: string;
}

function signInWithGoogle(errorPath: string) {
	return authClient.signIn.social({
		provider: "google",
		callbackURL: `${window.location.origin}/`,
		errorCallbackURL: window.location.origin + errorPath,
	});
}

export function SocialSignInButtons({ errorPath }: SocialSignInButtonsProps) {
	return (
		<>
			<button
				type="button"
				onClick={() => signInWithGoogle(errorPath)}
				className="mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-muted/30 py-3 text-sm font-bold"
			>
				<GoogleLogoIcon className="size-4" weight="bold" />
				{m.login_continue_google()}
			</button>
			<div className="mb-6 flex items-center gap-3 text-xs text-muted">
				<hr className="grow border-muted/30" />
				{m.login_or()}
				<hr className="grow border-muted/30" />
			</div>
		</>
	);
}
