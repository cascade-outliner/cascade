import { CrownIcon } from "@phosphor-icons/react/ssr";
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
	isPremium,
}: {
	user: UserMenuUser;
	className?: string;
	isPremium?: boolean;
}) {
	return (
		<span className="relative inline-flex shrink-0">
			{user.image ? (
				<img
					src={user.image}
					alt=""
					referrerPolicy="no-referrer"
					className={`rounded-full object-cover ${className ?? ""}`}
				/>
			) : (
				<span
					aria-hidden="true"
					className={`flex items-center justify-center rounded-full bg-danger/10 text-xs font-semibold text-danger ${className ?? ""}`}
				>
					{initials(user.name, user.email)}
				</span>
			)}
			{isPremium && (
				<span className="absolute -right-3 -bottom-2 flex size-6 items-center justify-center rounded-full  bg-white dark:bg-ink shadow-md">
					<CrownIcon
						aria-hidden="true"
						weight="fill"
						size={14}
						className="text-primary"
					/>
				</span>
			)}
		</span>
	);
}
