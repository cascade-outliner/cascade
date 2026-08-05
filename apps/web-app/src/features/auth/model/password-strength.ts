export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

/**
 * A lightweight heuristic (length + character variety), not an entropy
 * estimate — good enough to nudge users toward a stronger password without
 * pulling in a scoring library like zxcvbn.
 */
export function scorePasswordStrength(password: string): PasswordStrengthScore {
	if (!password) return 0;

	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;

	const varietyCount = [
		/[a-z]/.test(password),
		/[A-Z]/.test(password),
		/\d/.test(password),
		/[^A-Za-z0-9]/.test(password),
	].filter(Boolean).length;
	if (varietyCount >= 2) score++;
	if (varietyCount >= 3) score++;

	return Math.min(score, 4) as PasswordStrengthScore;
}
