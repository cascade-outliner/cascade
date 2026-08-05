import { m } from "#/paraglide/messages.js";
import {
	type PasswordStrengthScore,
	scorePasswordStrength,
} from "@/features/auth/model/password-strength";

// `primary` and `danger` are the same color in the default palette (see
// theme.css), so a red-to-green progression isn't reliably available across
// themes — every filled segment uses the same accent color and only the
// fill count + label communicate strength.
const filledSegment = "bg-accent";

function strengthLabel(score: PasswordStrengthScore): string {
	if (score <= 1) return m.register_password_strength_weak();
	if (score === 2) return m.register_password_strength_fair();
	if (score === 3) return m.register_password_strength_good();
	return m.register_password_strength_strong();
}

export function PasswordStrengthMeter({ password }: { password: string }) {
	if (!password) return null;
	const score = scorePasswordStrength(password);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex gap-1" aria-hidden>
				{[0, 1, 2, 3].map((segment) => (
					<span
						key={segment}
						className={`h-1 flex-1 rounded-full transition-colors duration-small-enter ${
							segment < score ? filledSegment : "bg-ink/10 dark:bg-surface/15"
						}`}
					/>
				))}
			</div>
			<p className="text-xs text-muted">{strengthLabel(score)}</p>
		</div>
	);
}
