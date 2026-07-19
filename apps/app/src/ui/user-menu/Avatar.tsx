import type { UserMenuUser } from "./types";

function initials(name: string, email: string): string {
	const source = name.trim() || email;
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
}

export function Avatar({
	user,
	className,
}: {
	user: UserMenuUser;
	className?: string;
}) {
	if (user.image) {
		return (
			<img
				src={user.image}
				alt=""
				referrerPolicy="no-referrer"
				className={`rounded-full object-cover ${className ?? ""}`}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`flex items-center justify-center rounded-full bg-danger/10 text-xs font-semibold text-danger ${className ?? ""}`}
		>
			{initials(user.name, user.email)}
		</span>
	);
}
